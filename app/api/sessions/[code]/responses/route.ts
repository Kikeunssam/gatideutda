import {
  endpoint,
  room,
  teacher,
  body,
  db,
  checked,
  publicSession,
} from "@/lib/server";
import {
  AppError,
  participant,
  responseInput,
  frequencies,
} from "@/lib/validation";
export const GET = endpoint(async (req, code) => {
  const s = await room(code),
    p = req.headers.get("x-participant-id");
  if (p) {
    const { data, error } = await db()
      .from("responses")
      .select("reflection,response_words(word)")
      .eq("session_id", s.id)
      .eq("participant_id", participant(p))
      .maybeSingle();
    checked(error);
    return {
      response: data
        ? {
            reflection: data.reflection,
            words: data.response_words.map((w) => w.word),
          }
        : null,
    };
  }
  await teacher(s);
  const [r, w, c, v] = await Promise.all([
    db().from("responses").select("reflection").eq("session_id", s.id),
    db().from("response_words").select("word").eq("session_id", s.id),
    db()
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", s.id),
    db()
      .from("ai_reviews")
      .select("content")
      .eq("session_id", s.id)
      .maybeSingle(),
  ]);
  [r, w, c, v].forEach((x) => checked(x.error));
  const allWords = frequencies((w.data ?? []).map((x) => x.word));
  return {
    session: { ...publicSession(s), youtube_url: s.youtube_url },
    participantCount: c.count ?? 0,
    responseCount: r.data?.length ?? 0,
    allWords,
    frequencies: allWords.filter((x) => !s.hidden_words.includes(x.word)),
    reflections: (r.data ?? []).map((x) => x.reflection).filter(Boolean),
    review: v.data?.content ?? "",
  };
});
const save = endpoint(async (req, code) => {
  const s = await room(code),
    b = await body(req),
    p = participant(req.headers.get("x-participant-id")),
    input = responseInput(b);
  const { error } = await db().rpc("save_response", {
    p_session: s.id,
    p_participant: p,
    p_words: input.words,
    p_reflection: input.reflection,
    p_update: req.method === "PUT",
  });
  if (error) {
    if (error.code === "23505")
      throw new AppError("이미 제출했습니다. 수정하기를 이용해주세요.", 409);
    if (error.message.includes("ROOM_CLOSED"))
      throw new AppError("지금은 응답을 받지 않습니다.", 409);
    if (error.message.includes("ROOM_EXPIRED"))
      throw new AppError("종료된 감상방입니다.", 410);
    checked(error);
  }
  return { ok: true, response: input };
});
export const POST = save;
export const PUT = save;
