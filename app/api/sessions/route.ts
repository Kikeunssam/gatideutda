import { NextRequest, NextResponse } from "next/server";
import {
  body,
  db,
  newCode,
  secret,
  hash,
  cookieName,
  assertOrigin,
} from "@/lib/server";
import { AppError, text, youtubeId } from "@/lib/validation";
import { DEFAULT_MESSAGE } from "@/lib/types";
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const b = await body(req),
      title = text(b.title, "활동 제목", 100, true),
      song_title = text(b.song_title, "곡 제목", 100, true),
      artist = text(b.artist, "작곡가 / 아티스트", 100),
      youtube_url = text(b.youtube_url, "YouTube URL", 500, true);
    const youtube_video_id = youtubeId(youtube_url);
    if (!youtube_video_id)
      throw new AppError("올바른 YouTube 링크를 입력해주세요.");
    const token = secret(),
      teacher_token_hash = hash(token);
    for (let i = 0; i < 8; i++) {
      const code = newCode();
      const { error } = await db()
        .from("sessions")
        .insert({
          code,
          title,
          song_title,
          artist,
          youtube_url,
          youtube_video_id,
          teacher_token_hash,
          teacher_message:
            text(b.teacher_message, "교사 안내 문구", 300) || DEFAULT_MESSAGE,
        });
      if (error?.code === "23505") continue;
      if (error)
        throw new AppError(
          "감상방을 만들지 못했습니다. 연결 설정을 확인해주세요.",
          503,
        );
      const res = NextResponse.json({ code }, { status: 201 });
      res.cookies.set(cookieName(code), token, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" &&
          req.nextUrl.protocol === "https:",
        sameSite: "strict",
        maxAge: 86400,
        path: `/api/sessions/${code}`,
      });
      return res;
    }
    throw new AppError("참여코드를 만들지 못했습니다. 다시 시도해주세요.", 503);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof AppError ? e.message : "감상방을 만들지 못했습니다.",
      },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
