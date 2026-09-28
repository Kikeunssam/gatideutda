import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AppError, validCode } from "./validation";
import type { Session } from "./types";
export function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new AppError(
      "감상방 연결 설정이 필요합니다. 선생님께 알려주세요.",
      503,
    );
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const secret = () => randomBytes(32).toString("hex");
export const newCode = () =>
  Array.from(
    { length: 6 },
    () =>
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[
        randomInt("ABCDEFGHJKMNPQRSTUVWXYZ23456789".length)
      ],
  ).join("");
export const cookieName = (code: string) => `teacher_${code}`;
export async function room(code: string) {
  validCode(code);
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error)
    throw new AppError(
      "감상방을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  if (!data) throw new AppError("참여코드에 맞는 감상방이 없습니다.", 404);
  if (new Date(data.expires_at).getTime() <= Date.now())
    throw new AppError("종료된 감상방입니다.", 410);
  return data as Session & { teacher_token_hash: string };
}
export async function teacher(
  session: Session & { teacher_token_hash: string },
) {
  const token = (await cookies()).get(cookieName(session.code))?.value;
  if (
    !token ||
    !timingSafeEqual(
      Buffer.from(hash(token)),
      Buffer.from(session.teacher_token_hash),
    )
  )
    throw new AppError(
      "감상방을 만든 브라우저에서 교사 화면을 열어주세요.",
      403,
    );
}
export function publicSession(s: Session): Session {
  return {
    id: s.id,
    code: s.code,
    title: s.title,
    song_title: s.song_title,
    artist: s.artist,
    youtube_video_id: s.youtube_video_id,
    teacher_message: s.teacher_message,
    status: s.status,
    hidden_words: s.hidden_words,
    expires_at: s.expires_at,
  };
}
export async function body(req: NextRequest): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > 16000) throw new AppError("입력 내용이 너무 깁니다.", 413);
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new AppError("입력 내용을 확인해주세요.");
  }
}
export function checked(error: unknown) {
  if (error)
    throw new AppError("저장하지 못했습니다. 잠시 후 다시 시도해주세요.", 503);
}
export function endpoint(
  fn: (req: NextRequest, code: string) => Promise<unknown>,
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<{ code: string }> },
  ) => {
    try {
      if (req.method !== "GET") assertOrigin(req);
      const result = await fn(req, (await ctx.params).code);
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof AppError
              ? e.message
              : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
        },
        {
          status: e instanceof AppError ? e.status : 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}

export function assertOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let sameHost = false;
  try {
    const parsed = new URL(origin);
    sameHost =
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === req.headers.get("host");
  } catch {
    /* Invalid Origin is rejected below. */
  }
  if (!sameHost && origin !== process.env.NEXT_PUBLIC_APP_URL)
    throw new AppError("잘못된 요청입니다.", 403);
}
