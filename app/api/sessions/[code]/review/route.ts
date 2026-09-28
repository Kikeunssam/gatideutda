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
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  let res: Response | undefined;
  let connectionError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: REVIEW_INSTRUCTIONS }] },
            contents: [
              { role: "user", parts: [{ text: JSON.stringify(input) }] },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 640,
              // A classroom summary does not need a reasoning pass. Skipping it
              // avoids long waits on the free tier.
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(22000),
        },
      );
      if (res.ok || res.status !== 503 || attempt === 1) break;
    } catch (error) {
      connectionError = error;
      if (attempt === 1) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  if (!res) {
    const error = connectionError;
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    ) {
      throw new AppError(
        "Gemini 응답이 제시간에 도착하지 않았어요. 잠시 후 다시 시도해주세요.",
        504,
      );
    }
    throw new AppError(
      "Gemini 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
      502,
    );
  }
  if (!res.ok) {
    // Only log status and model; never keys, student input, or raw API errors.
    console.error("Review generation failed", { status: res.status, model });
    if (res.status === 429)
      throw new AppError(
        "Gemini 사용 한도를 초과했어요. 잠시 후 다시 시도하거나 Google AI Studio에서 사용 한도를 확인해주세요.",
        429,
      );
    if ([400, 401, 403].includes(res.status))
      throw new AppError(
        "Gemini API 키 또는 접근 설정을 확인해주세요. 배포 서버의 Gemini 비밀키 설정 확인이 필요합니다.",
        502,
      );
    if (res.status === 404)
      throw new AppError(
        "설정된 Gemini 모델을 사용할 수 없어요. 배포 서버의 GEMINI_MODEL 설정을 확인해주세요.",
        502,
      );
    throw new AppError(
      "Gemini 서버가 일시적으로 응답하지 못했어요. 잠시 후 다시 시도해주세요.",
      502,
    );
  }
  const result = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string; thought?: boolean }[] };
    }[];
  };
  const content = result.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
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
