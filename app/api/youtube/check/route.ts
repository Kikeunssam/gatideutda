import { NextRequest, NextResponse } from "next/server";
import { checkYouTube } from "@/lib/youtube-check";
import { isVideoId } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId") ?? "";
  if (!isVideoId(videoId))
    return NextResponse.json(
      { error: "올바른 YouTube 링크를 입력해주세요." },
      { status: 400 },
    );
  const result = await checkYouTube(videoId, process.env.YOUTUBE_API_KEY);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
