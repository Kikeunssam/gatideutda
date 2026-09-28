-- Run once in Supabase SQL Editor. Browser clients have no table access.
create table public.sessions (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-HJKMNP-Z2-9]{6}$'),
 title text not null check(length(title) between 1 and 100), song_title text not null check(length(song_title) between 1 and 100), artist text not null default '',
 youtube_url text not null, youtube_video_id text not null, teacher_message text not null default '',
 teacher_token_hash text not null check(length(teacher_token_hash)=64),
 status text not null default 'waiting' check(status in ('waiting','collecting','closed')),
 hidden_words text[] not null default '{}', created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '24 hours'),
 review_requested_at timestamptz
);
create table public.participants (
 session_id uuid references public.sessions on delete cascade, participant_id uuid not null, created_at timestamptz not null default now(), primary key(session_id,participant_id)
);
create table public.responses (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.sessions on delete cascade, participant_id uuid not null,
 reflection text not null default '' check(length(reflection)<=200), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(session_id,participant_id), unique(id,session_id)
);
create table public.response_words (
 id uuid primary key default gen_random_uuid(), response_id uuid not null, session_id uuid not null references public.sessions on delete cascade,
 word text not null check(length(trim(word)) between 1 and 20), created_at timestamptz not null default now(),
 foreign key(response_id,session_id) references public.responses(id,session_id) on delete cascade, unique(response_id,word)
);
create table public.ai_reviews (
 id uuid primary key default gen_random_uuid(), session_id uuid not null unique references public.sessions on delete cascade,
 content text not null check(length(content)<=3000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index sessions_expiry_idx on public.sessions(expires_at);
create index response_words_session_idx on public.response_words(session_id);
alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;
alter table public.response_words enable row level security;
alter table public.ai_reviews enable row level security;
revoke all on public.sessions,public.participants,public.responses,public.response_words,public.ai_reviews from anon,authenticated;
-- Row lock serializes response writes against teacher status updates and expiry checks.
create function public.save_response(p_session uuid,p_participant uuid,p_words text[],p_reflection text,p_update boolean)
returns uuid language plpgsql set search_path=public as $$
declare s public.sessions; rid uuid;
begin
 select * into s from public.sessions where id=p_session for update;
 if s.id is null or s.expires_at<=now() then raise exception 'ROOM_EXPIRED'; end if;
 if s.status<>'collecting' then raise exception 'ROOM_CLOSED'; end if;
 if cardinality(p_words) not between 1 and 6 or exists(select 1 from unnest(p_words) w where length(trim(w)) not between 1 and 20) or (select count(distinct lower(w)) from unnest(p_words) w)<>cardinality(p_words) or length(p_reflection)>200 then raise exception 'INVALID_INPUT'; end if;
 if p_update then
  update public.responses set reflection=p_reflection,updated_at=now() where session_id=p_session and participant_id=p_participant returning id into rid;
  if rid is null then raise exception 'RESPONSE_MISSING'; end if;
 else
  insert into public.responses(session_id,participant_id,reflection) values(p_session,p_participant,p_reflection) returning id into rid;
 end if;
 insert into public.participants(session_id,participant_id) values(p_session,p_participant) on conflict do nothing;
 delete from public.response_words where response_id=rid;
 insert into public.response_words(response_id,session_id,word) select rid,p_session,w from unnest(p_words) w;
 return rid;
end $$;
revoke all on function public.save_response(uuid,uuid,text[],text,boolean) from public,anon,authenticated;
grant execute on function public.save_response(uuid,uuid,text[],text,boolean) to service_role;
-- Future cleanup: delete from public.sessions where expires_at < now()-interval '7 days';
