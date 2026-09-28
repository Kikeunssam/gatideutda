export type YouTubeEmbedStatus =
  "idle" | "checking" | "available" | "blocked" | "unavailable" | "error";
export type YouTubeEmbedResult = {
  videoId: string;
  status: YouTubeEmbedStatus;
  errorCode?: number;
  reason?: string;
};
export const isVideoId = (id: string) => /^[a-zA-Z0-9_-]{11}$/.test(id);
export function extractYouTubeVideoId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.port
    )
      return null;
    let id: string | null = null;
    if (u.hostname === "youtu.be" && /^\/[^/]+\/?$/.test(u.pathname))
      id = u.pathname.split("/")[1];
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    ) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (/^\/(shorts|embed|live)\/[^/]+\/?$/.test(u.pathname))
        id = u.pathname.split("/")[2];
    }
    return id && isVideoId(id) ? id : null;
  } catch {
    return null;
  }
}
export function youtubeError(
  videoId: string,
  errorCode: number,
): YouTubeEmbedResult {
  const errors: Record<number, [YouTubeEmbedStatus, string]> = {
    101: ["blocked", "영상 소유자가 외부 사이트 재생을 허용하지 않았습니다."],
    150: ["blocked", "영상 소유자가 외부 사이트 재생을 허용하지 않았습니다."],
    100: ["unavailable", "삭제되었거나 비공개 영상이라 재생할 수 없습니다."],
    2: ["error", "올바르지 않은 YouTube 영상입니다."],
    5: ["error", "이 영상은 현재 브라우저에서 재생할 수 없습니다."],
    153: [
      "error",
      "현재 환경에서 YouTube Player 인증 정보를 확인할 수 없습니다.",
    ],
  };
  const [status, reason] = errors[errorCode] ?? [
    "error",
    "영상을 재생할 수 없습니다. YouTube에서 직접 확인해주세요.",
  ];
  return { videoId, status, errorCode, reason };
}
export const embedFailed = (status: YouTubeEmbedStatus) =>
  ["blocked", "unavailable", "error"].includes(status);
