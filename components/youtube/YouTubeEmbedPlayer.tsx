"use client";
import { useEffect, useRef, useState } from "react";
import {
  embedFailed,
  extractYouTubeVideoId,
  youtubeError,
  type YouTubeEmbedResult,
} from "@/lib/youtube";
import { loadYouTubeAPI, type YTPlayer } from "@/lib/youtube-player-api";

type Props = {
  videoId: string;
  originalUrl: string;
  onStatusChange?: (result: YouTubeEmbedResult) => void;
};
export function YouTubeEmbedPlayer(props: Props) {
  return <PlayerSession key={props.videoId} {...props} />;
}
function PlayerSession({ videoId, originalUrl, onStatusChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(onStatusChange);
  const [result, setResult] = useState<YouTubeEmbedResult>({
    videoId,
    status: "checking",
  });
  useEffect(() => {
    callback.current = onStatusChange;
  }, [onStatusChange]);
  useEffect(() => {
    let active = true,
      failed = false;
    let player: YTPlayer | undefined;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const node = host.current;
    function report(value: YouTubeEmbedResult) {
      if (!active || failed) return;
      if (embedFailed(value.status)) {
        failed = true;
        clearTimeout(readyTimer);
        player?.destroy();
      }
      setResult(value);
      callback.current?.(value);
    }
    async function start() {
      report({ videoId, status: "checking" });
      try {
        const response = await fetch(
          `/api/youtube/check?videoId=${encodeURIComponent(videoId)}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(5000),
            ]),
          },
        );
        if (response.ok) {
          const check = await response.json();
          if (check.videoId === videoId && embedFailed(check.status)) {
            report(check);
            return;
          }
        }
      } catch {
        /* Optional precheck failure must not prevent runtime inspection. */
      }
      if (!active) return;
      try {
        const yt = await loadYouTubeAPI();
        if (!active || !node) return;
        const frame = document.createElement("iframe");
        frame.title = "YouTube 음악 재생";
        frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
        frame.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.allowFullscreen = true;
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        node.appendChild(frame);
        readyTimer = setTimeout(
          () =>
            report({
              videoId,
              status: "error",
              reason:
                "YouTube에 연결하지 못했어요. 네트워크를 확인하거나 YouTube에서 직접 재생해주세요.",
            }),
          15000,
        );
        player = new yt.Player(frame, {
          events: {
            onReady: () => {
              clearTimeout(readyTimer);
              report({
                videoId,
                status: "checking",
                reason: "재생 버튼을 눌러 영상 재생 여부를 확인해주세요.",
              });
            },
            onError: (event) => report(youtubeError(videoId, event.data)),
            onStateChange: (event) => {
              if (event.data === 1) {
                clearTimeout(readyTimer);
                report({ videoId, status: "available" });
              }
            },
          },
        });
      } catch {
        report({
          videoId,
          status: "error",
          reason:
            "YouTube 플레이어를 불러오지 못했어요. YouTube에서 직접 확인해주세요.",
        });
      }
    }
    void start();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(readyTimer);
      player?.destroy();
      node?.replaceChildren();
    };
  }, [videoId]);
  const failed = embedFailed(result.status);
  const href =
    extractYouTubeVideoId(originalUrl) === videoId
      ? originalUrl.trim()
      : `https://www.youtube.com/watch?v=${videoId}`;
  return (
    <div className="youtube-embed">
      {!failed && (
        <p
          className={`youtube-status ${result.status === "available" ? "success" : ""}`}
          role="status"
        >
          {result.status === "available"
            ? "✓ 같이듣다에서 재생할 수 있는 영상입니다."
            : result.reason || (
                <>
                  <span className="youtube-spinner" aria-hidden="true" />
                  영상 재생 가능 여부를 확인하고 있어요...
                </>
              )}
        </p>
      )}
      <div ref={host} className="youtube-player-frame" hidden={failed} />
      {failed && (
        <div className="youtube-fallback" role="status">
          <span className="youtube-note" aria-hidden="true">
            ♫
          </span>
          <h3>YouTube 재생 안내</h3>
          <strong>
            {result.status === "blocked"
              ? "이 영상은 외부 사이트에서 재생할 수 없습니다."
              : result.reason}
          </strong>
          {result.status === "blocked" && (
            <p>
              영상 소유자의 설정 또는 YouTube의 재생 제한으로 인해 같이듣다
              안에서 재생할 수 없습니다.
            </p>
          )}
          <p>
            다른 영상을 선택하거나 YouTube에서 직접 재생해주세요.
            <br />
            YouTube에서 음악을 재생한 뒤 학생들과 감상 활동을 계속할 수
            있습니다.
          </p>
          <a
            className="button secondary"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube에서 열기 ↗
          </a>
        </div>
      )}
    </div>
  );
}
