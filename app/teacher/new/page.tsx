"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/brand";
import { api, messageOf } from "@/lib/client";
import { DEFAULT_MESSAGE } from "@/lib/types";
import { youtubeId } from "@/lib/validation";
import { YouTubeEmbedPlayer } from "@/components/youtube/YouTubeEmbedPlayer";
import { embedFailed, type YouTubeEmbedResult } from "@/lib/youtube";
export default function Create() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [embed, setEmbed] = useState<YouTubeEmbedResult | null>(null);
  const [pending, setPending] = useState<Record<
    string,
    FormDataEntryValue
  > | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewUrl(url), 400);
    return () => clearTimeout(timer);
  }, [url]);
  useEffect(() => {
    if (pending) dialog.current?.showModal();
    else dialog.current?.close();
  }, [pending]);
  async function create(data: Record<string, FormDataEntryValue>) {
    setBusy(true);
    setError("");
    setPending(null);
    try {
      const result = await api<{ code: string }>("/api/sessions", "POST", data);
      router.push(`/teacher/${result.code}`);
    } catch (e) {
      setError(messageOf(e));
      setBusy(false);
    }
  }
  return (
    <>
      <Header teacher />
      <main className="form-page">
        <Link className="back" href="/">
          ← 처음으로
        </Link>
        <div className="create-intro">
          <div>
            <div className="eyebrow">선생님의 수업 준비</div>
            <h1>새로운 감상방 만들기</h1>
            <p className="subtitle">오늘 함께 들을 음악을 골라주세요.</p>
          </div>
          <Image
            src="/images/classroom.png"
            alt="선생님과 학생들이 함께 음악을 감상하는 모습"
            width={1672}
            height={941}
            sizes="(max-width: 600px) 160px, 210px"
            className="create-art"
          />
        </div>
        <form
          className="card form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const data = Object.fromEntries(new FormData(e.currentTarget));
            if (!youtubeId(url)) {
              setError("올바른 YouTube 링크를 입력해주세요.");
              return;
            }
            if (
              embed?.videoId === youtubeId(url) &&
              embedFailed(embed.status)
            ) {
              setPending(data);
              return;
            }
            await create(data);
          }}
        >
          <label>
            감상 활동 제목 <em>*</em>
            <input
              name="title"
              required
              maxLength={100}
              placeholder="드뷔시 「달빛」 감상하기"
            />
          </label>
          <div className="form-row">
            <label>
              곡 제목 <em>*</em>
              <input
                name="song_title"
                required
                maxLength={100}
                placeholder="Clair de Lune"
              />
            </label>
            <label>
              <span className="field-label-line">
                작곡가 / 아티스트 <small>선택</small>
              </span>
              <input
                name="artist"
                maxLength={100}
                placeholder="클로드 드뷔시"
              />
            </label>
          </div>
          <label>
            YouTube URL <em>*</em>
            <input
              name="youtube_url"
              ref={urlInput}
              required
              type="url"
              maxLength={500}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setEmbed(null);
                setPending(null);
              }}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            {url && !youtubeId(url) && (
              <small className="error-text">
                올바른 YouTube 링크를 입력해주세요.
              </small>
            )}
          </label>
          {youtubeId(url) &&
            (previewUrl === url ? (
              <YouTubeEmbedPlayer
                videoId={youtubeId(url)!}
                originalUrl={url}
                onStatusChange={setEmbed}
              />
            ) : (
              <p className="youtube-status" role="status">
                <span className="youtube-spinner" aria-hidden="true" />
                영상 재생 가능 여부를 확인하고 있어요...
              </p>
            ))}
          <label>
            <span className="field-label-line">
              교사 안내 문구 <small>선택</small>
            </span>
            <textarea
              name="teacher_message"
              maxLength={300}
              rows={3}
              defaultValue={DEFAULT_MESSAGE}
            />
          </label>
          <div className="notice">
            감상방은 만든 시점부터 24시간 동안 열려 있어요.
            <br />
            교사 관리는 감상방을 만든 브라우저에서 이어갈 수 있어요.
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy || !youtubeId(url)}>
            {busy ? "감상방을 만들고 있어요…" : "감상방 만들기 →"}
          </button>
        </form>
        <dialog
          ref={dialog}
          className="youtube-confirm"
          aria-labelledby="youtube-confirm-title"
          onCancel={() => setPending(null)}
        >
          <h2 id="youtube-confirm-title">YouTube에서 별도로 재생할까요?</h2>
          <p>
            이 영상은 같이듣다 안에서 재생할 수 없습니다.
            <br />
            감상방은 만들 수 있지만 음악은 YouTube에서 별도로 재생해야 합니다.
          </p>
          <div className="music-actions">
            <button
              type="button"
              onClick={() => {
                setPending(null);
                urlInput.current?.focus();
              }}
            >
              다른 영상 선택
            </button>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => {
                if (pending) void create(pending);
              }}
            >
              그대로 감상방 만들기
            </button>
          </div>
        </dialog>
      </main>
    </>
  );
}
