import { endpoint, room, teacher, body, db, checked } from "@/lib/server";
import { AppError, text, frequencies } from "@/lib/validation";
import { REVIEW_INSTRUCTIONS, reviewData } from "@/lib/review";
export const maxDuration = 60;
export const POST = endpoint(async (_req, code) => {
  const s = await room(code);
  await teacher(s);
  if (!process.env.GEMINI_API_KEY)
    throw new AppError("Gemini API 설정이 필요합니다.", 503);
  const { data, error } = await db()
    .from("responses")
    .select("reflection,response_words(word)")
    .eq("session_id", s.id);
  checked(error);
  if (!data?.length)
    throw new AppError("학생들의 생각이 모이면 감상평을 만들 수 있어요.");
  const input = reviewData(
    s.song_title,
    s.artist,
    frequencies(data.flatMap((r) => r.response_words.map((w) => w.word))),
    data
      .filter(
        (r) => !r.response_words.some((w) => s.hidden_words.includes(w.word)),
      )
      .map((r) => r.reflection),
    s.hidden_words,
  );
  if (!input.word_frequencies.length && !input.anonymous_reflections.length)
    throw new AppError("숨긴 단어를 제외한 감상 내용이 없습니다.");
  const cutoff = new Date(Date.now() - 30000).toISOString();
  const lock = await db()
    .from("sessions")
    .update({ review_requested_at: new Date().toISOString() })
    .eq("id", s.id)
    .or(`review_requested_at.is.null,review_requested_at.lt.${cutoff}`)
    .select("id");
  checked(lock.error);
  if (!lock.data?.length)
    throw new AppError(
      "감상평을 준비하고 있어요. 30초 후 다시 시도해주세요.",
      429,
    );
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: REVIEW_INSTRUCTIONS }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(45000),
    },
  );
  if (!res.ok)
    throw new AppError(
      "감상평을 만들지 못했습니다. Gemini API 키와 무료 한도를 확인해주세요.",
      502,
    );
  const result = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!content)
    throw new AppError("감상평이 비어 있습니다. 다시 시도해주세요.", 502);
  return { content: content.slice(0, 3000) };
});
export const PUT = endpoint(async (req, code) => {
  const s = await room(code);
  await teacher(s);
  const b = await body(req);
  const content = text(b.content, "감상평", 3000, true);
  const { error } = await db()
    .from("ai_reviews")
    .upsert(
      { session_id: s.id, content, updated_at: new Date().toISOString() },
      { onConflict: "session_id" },
    );
  checked(error);
  return { ok: true };
});
