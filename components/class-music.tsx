"use client";
import { useEffect, useRef, useState } from "react";
import { messageOf } from "@/lib/client";

export function ClassMusic({
  code,
  disabled,
  dirty,
}: {
  code: string;
  disabled: boolean;
  dirty: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function create() {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    const timer = setTimeout(() => request.abort(), 80000);
    try {
      const response = await fetch(`/api/sessions/${code}/music`, {
        method: "POST",
        signal: request.signal,
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "음악을 만들지 못했어요.",
        );
      const blob = await response.blob();
      if (!request.signal.aborted) setUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(
        request.signal.aborted
          ? "음악 만들기를 중지했어요. 필요하면 다시 시도해주세요."
          : messageOf(e),
      );
    } finally {
      clearTimeout(timer);
      controller.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="card class-music">
      <span className="eyebrow">새롭게 만들기 · 20초 연주곡</span>
      <h2>우리 반의 생각이 음악이 돼요</h2>
      <p>
        감상구름과 저장된 종합 감상평을 담아 우리 반만의 짧은 음악을 만들어요.
      </p>
      <div className="music-actions">
        <button
          className="primary"
          disabled={disabled || dirty || busy}
          onClick={create}
        >
          {busy
            ? "♫ 우리 반 음악 만드는 중…"
            : url
              ? "♫ 우리반 분석 결과로 다시 만들기"
              : "♫ 우리반 분석 결과로 음악만들기"}
        </button>
        {busy && (
          <button onClick={() => controller.current?.abort()}>생성 중지</button>
        )}
      </div>
      {dirty && (
        <p className="quiet">편집한 감상평을 저장한 뒤 음악을 만들어주세요.</p>
      )}
      {busy && (
        <p role="status">
          감상에 어울리는 악기와 분위기를 정하고 20초 음악을 만들어요. 약 1분
          정도 걸릴 수 있어요.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {url && (
        <div className="music-result">
          <audio aria-label="우리 반이 만든 음악" controls src={url} />
          <a
            className="button secondary"
            href={url}
            download={`우리반-음악-${code}.wav`}
          >
            ↓ 음악 WAV 내려받기
          </a>
          <p className="quiet">
            새로고침하면 음악이 사라져요. 보관하려면 내려받아주세요.
          </p>
        </div>
      )}
    </section>
  );
}
