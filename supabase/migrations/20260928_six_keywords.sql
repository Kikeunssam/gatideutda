-- Preserve the existing function and permissions; change only the keyword limit.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.save_response(uuid,uuid,text[],text,boolean)'::regprocedure);
  if position('cardinality(p_words) not between 1 and 3' in definition) > 0 then
    execute replace(definition, 'cardinality(p_words) not between 1 and 3', 'cardinality(p_words) not between 1 and 6');
  elsif position('cardinality(p_words) not between 1 and 6' in definition) = 0 then
    raise exception 'Unexpected save_response definition; review before migrating';
  end if;
end $$;
