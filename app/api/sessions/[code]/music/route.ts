import { NextRequest, NextResponse } from "next/server";
import { assertOrigin, room, teacher, db, checked } from "@/lib/server";
import { AppError, frequencies } from "@/lib/validation";
import { generateMusic, musicPrompt } from "@/lib/music";
import { designMusic } from "@/lib/music-plan";

export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    assertOrigin(req);
    const s = await room((await ctx.params).code);
    await teacher(s);
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AppError("Gemini API 설정이 필요합니다.", 503);
    const responses = await db()
      .from("responses")
      .select("response_words(word)")
      .eq("session_id", s.id);
    checked(responses.error);
    const words = frequencies(
      (responses.data ?? []).flatMap((r) =>
        r.response_words.map((w) => w.word),
      ),
    ).filter((w) => !s.hidden_words.includes(w.word));
    if (!words.length)
      throw new AppError("감상구름에 생각이 모이면 음악을 만들 수 있어요.");
    const review = await db()
      .from("ai_reviews")
      .select("content")
      .eq("session_id", s.id)
      .maybeSingle();
    checked(review.error);
    // Share the existing database-backed AI cooldown across server instances.
    const lock = await db()
      .from("sessions")
      .update({ review_requested_at: new Date().toISOString() })
      .eq("id", s.id)
      .or(
        `review_requested_at.is.null,review_requested_at.lt.${new Date(Date.now() - 60000).toISOString()}`,
      )
      .select("id");
    checked(lock.error);
    if (!lock.data?.length)
      throw new AppError(
        "최근 AI 작업을 요청했어요. 1분 후 다시 음악을 만들어주세요.",
        429,
      );
    const plan = await designMusic(
      key,
      musicPrompt(words, review.data?.content ?? "", s.hidden_words),
      req.signal,
    );
    const wav = await generateMusic(
      key,
      plan.prompt,
      req.signal,
      undefined,
      plan,
    );
    return new Response(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="gatideutda-${s.code}.wav"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AppError
            ? e.message
            : "음악을 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
      {
        status: e instanceof AppError ? e.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
