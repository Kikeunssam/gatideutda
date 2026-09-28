export type YTPlayer = { destroy(): void };
type PlayerOptions = {
  events: {
    onReady(): void;
    onError(event: { data: number }): void;
    onStateChange(event: { data: number }): void;
  };
};
type YouTubeAPI = {
  Player: new (element: HTMLIFrameElement, options: PlayerOptions) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
  }
}
let loading: Promise<YouTubeAPI> | undefined;
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeAPI>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const owned = !script;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
    }
    const cleanup = () => {
      clearInterval(poll);
      clearTimeout(timeout);
      script?.removeEventListener("error", fail);
    };
    const fail = () => {
      cleanup();
      if (owned) script?.remove();
      reject(new Error("YouTube API unavailable"));
    };
    // Poll the documented YT global without overwriting another consumer's ready callback.
    const poll = setInterval(() => {
      if (window.YT?.Player) {
        cleanup();
        resolve(window.YT);
      }
    }, 100);
    const timeout = setTimeout(fail, 12000);
    script.addEventListener("error", fail, { once: true });
    if (owned) document.head.appendChild(script);
  }).catch((e) => {
    loading = undefined;
    throw e;
  });
  return loading;
}
