import { isVideoId, youtubeError, type YouTubeEmbedResult } from "./youtube";

export type YouTubePrecheck = YouTubeEmbedResult & {
  availableCandidate?: boolean;
  source: "runtime" | "data-api";
};
// This helper is imported by the server route only. No credentials are returned.
export async function checkYouTube(
  videoId: string,
  key?: string,
  request = fetch,
): Promise<YouTubePrecheck> {
  if (!isVideoId(videoId))
    return { ...youtubeError(videoId, 2), source: "runtime" };
  const runtime: YouTubePrecheck = {
    videoId,
    status: "checking",
    source: "runtime",
  };
  if (!key) return runtime;
  try {
    const query = new URLSearchParams({
      part: "status,snippet",
      id: videoId,
      key,
    });
    const response = await request(
      `https://www.googleapis.com/youtube/v3/videos?${query}`,
      { signal: AbortSignal.timeout(4000), cache: "no-store" },
    );
    if (!response.ok) return runtime;
    const data = await response.json();
    if (!Array.isArray(data.items)) return runtime;
    const video = data.items[0];
    if (!video || video.status?.privacyStatus === "private")
      return { ...youtubeError(videoId, 100), source: "data-api" };
    if (video.status?.embeddable === false)
      return { ...youtubeError(videoId, 101), source: "data-api" };
    return {
      ...runtime,
      source: "data-api",
      availableCandidate: video.status?.embeddable === true,
    };
  } catch {
    return runtime;
  }
}
