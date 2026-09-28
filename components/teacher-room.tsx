"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Header } from "./brand";
import { YouTubeEmbedPlayer } from "./youtube/YouTubeEmbedPlayer";
import { Cloud } from "./cloud";
import { CloudPresentation } from "./cloud-presentation";
import { Worksheet } from "./worksheet";
import { ClassMusic } from "./class-music";
import { api, messageOf } from "@/lib/client";
import { Dashboard, Status, STATUS_LABEL } from "@/lib/types";
export function TeacherRoom({ code }: { code: string }) {
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(""),
    [draft, setDraft] = useState(""),
    [dirty, setDirty] = useState(false),
    [qr, setQr] = useState(""),
    [showQr, setShowQr] = useState(false),
    [joinUrl, setJoinUrl] = useState(""),
    [blocked, setBlocked] = useState(false);
  const initialized = useRef(false);
  const refresh = useCallback(async () => {
    const d = await api<Dashboard>(`/api/sessions/${code}/responses`);
    setData(d);
    setBlocked(false);
    if (!initialized.current) {
      setDraft(d.review);
      initialized.current = true;
    }
  }, [code]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const url = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || window.location.origin}/join/${code}`;
    async function poll() {
      try {
        await refresh();
        if (active) {
          setError("");
          setJoinUrl(url);
        }
      } catch (e) {
        if (active) {
          setError(messageOf(e));
          setBlocked(true);
        }
      } finally {
        if (active) timer = setTimeout(poll, 2000);
      }
    }
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [code, refresh]);
  async function action(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy("");
    }
  }
  async function status(next: Status) {
    await action("status", async () => {
      await api(`/api/sessions/${code}/status`, "POST", { status: next });
      await refresh();
      setNotice(STATUS_LABEL[next]);
    });
  }
  async function hide(word: string, restore = false) {
    await action("hide", async () => {
      const words = restore
        ? data!.session.hidden_words.filter((w) => w !== word)
        : [...data!.session.hidden_words, word];
      await api(`/api/sessions/${code}/hidden-words`, "POST", { words });
      await refresh();
      setNotice(
        restore
          ? "단어를 복원했어요."
          : "감상구름에서 단어를 숨겼어요. 감상평은 필요하면 다시 만들어주세요.",
      );
    });
  }
  return (
    <>
      <Header teacher />
      <main className="dashboard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="toast" role="status">
            {notice}
          </p>
        )}
        {!data ? (
          <div className="card empty">
            {error
              ? "감상방을 만든 브라우저인지 확인해주세요."
              : "우리 반 감상방을 준비하고 있어요…"}
          </div>
        ) : (
          <>
            <div className="dashboard-title">
              <div>
                <div className="eyebrow">선생님의 음악 감상실</div>
                <h1>{data.session.title}</h1>
                <p className="subtitle">
                  {data.session.song_title}
                  {data.session.artist && ` · ${data.session.artist}`}
                </p>
              </div>
              <div className="invite card">
                <span>학생 초대</span>
                <strong aria-label={`우리 반 참여코드 ${code}`}>{code}</strong>
                <div>
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() =>
                      action("qr", async () => {
                        const QRCode = await import("qrcode");
                        setQr(
                          await QRCode.toDataURL(joinUrl, {
                            width: 280,
                            margin: 2,
                            color: { dark: "#30445d", light: "#ffffff" },
                          }),
                        );
                        setShowQr(!showQr);
                      })
                    }
                  >
                    QR 코드 {showQr ? "닫기" : "보기"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      action("copy", async () => {
                        await navigator.clipboard.writeText(joinUrl);
                        setNotice("학생 접속 주소를 복사했어요.");
                      })
                    }
                  >
                    주소 복사 ↗
                  </button>
                </div>
              </div>
            </div>
            {showQr && qr && (
              <div className="qr-panel card">
                <Image
                  unoptimized
                  src={qr}
                  alt="학생 감상방 참여 QR 코드"
                  width={240}
                  height={240}
                />
                <div>
                  <h2>카메라로 찍고, 함께 들어요.</h2>
                  <a href={joinUrl} target="_blank" rel="noreferrer">
                    {joinUrl}
                  </a>
                  <p className="quiet">
                    학생 기기에서 접속 가능한 주소여야 해요.
                  </p>
                </div>
              </div>
            )}
            <div className="session-bar">
              <div>
                <span className={`pill ${data.session.status}`}>
                  {STATUS_LABEL[data.session.status]}
                </span>
                <span>
                  참여 <b>{data.participantCount}</b>명
                </span>
                <span>
                  응답 <b>{data.responseCount}</b>개
                </span>
              </div>
              <button
                className={
                  data.session.status === "collecting" ? "secondary" : "primary"
                }
                disabled={!!busy || blocked}
                onClick={() =>
                  status(
                    data.session.status === "collecting"
                      ? "closed"
                      : "collecting",
                  )
                }
              >
                {busy === "status"
                  ? "변경 중…"
                  : data.session.status === "collecting"
                    ? "응답 마감"
                    : data.session.status === "closed"
                      ? "다시 응답 받기"
                      : "응답 시작"}
              </button>
            </div>
            <div className="teacher-grid">
              <section className="card music">
                <div className="section-heading">
                  <h2>함께 듣는 음악</h2>
                  <span>01</span>
                </div>
                <YouTubeEmbedPlayer
                  videoId={data.session.youtube_video_id}
                  originalUrl={
                    data.session.youtube_url ??
                    `https://www.youtube.com/watch?v=${data.session.youtube_video_id}`
                  }
                />
                <p className="teacher-message">
                  {data.session.teacher_message}
                </p>
                <p className="quiet">음악은 교사 PC에서 재생해 함께 들어요.</p>
              </section>
              <section className="card cloud-card">
                <div className="section-heading">
                  <h2>
                    우리 반 감상구름 <span className="spark">✦</span>
                  </h2>
                  <small>2초마다 업데이트</small>
                </div>
                <CloudPresentation words={data.frequencies} />
                <Cloud words={data.frequencies} />
              </section>
            </div>
            <div className="teacher-grid lower">
              <section className="card">
                <div className="section-heading">
                  <h2>우리 반에서 많이 나온 생각</h2>
                  <span>TOP 10</span>
                </div>
                {data.frequencies.length ? (
                  <ol className="top-words">
                    {data.frequencies.slice(0, 10).map((w, i) => (
                      <li key={w.word}>
                        <span className="rank">{i + 1}</span>
                        <div>
                          <span>{w.word}</span>
                          <i
                            style={{
                              width: `${(100 * w.count) / data.frequencies[0].count}%`,
                            }}
                          />
                        </div>
                        <b>{w.count}</b>
                        <button
                          className="text-button"
                          disabled={!!busy || blocked}
                          aria-label={`${w.word} 감상구름에서 숨기기`}
                          onClick={() => hide(w.word)}
                        >
                          숨기기
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="empty-small">
                    생각이 모이면 많이 나온 단어를 보여드려요.
                  </p>
                )}
                <details>
                  <summary>전체 단어 관리 · {data.allWords.length}개</summary>
                  <div className="manage-words">
                    {data.allWords.map((w) => (
                      <button
                        key={w.word}
                        disabled={!!busy || blocked}
                        className={
                          data.session.hidden_words.includes(w.word)
                            ? "hidden-word"
                            : ""
                        }
                        onClick={() =>
                          hide(
                            w.word,
                            data.session.hidden_words.includes(w.word),
                          )
                        }
                      >
                        {w.word} · {w.count}{" "}
                        {data.session.hidden_words.includes(w.word)
                          ? "복원"
                          : "숨기기"}
                      </button>
                    ))}
                  </div>
                </details>
              </section>
              <section className="card review">
                <div className="section-heading">
                  <h2>우리 반 종합 감상평</h2>
                  <span className="ai-badge">AI와 함께</span>
                </div>
                <p className="quiet">
                  {data.responseCount < 3
                    ? "3명 이상의 생각이 모이면 더 풍부한 감상평이 돼요."
                    : "우리 반의 단어와 익명 감상을 바탕으로 정리해요."}
                </p>
                <button
                  className="secondary"
                  disabled={!!busy || blocked || data.responseCount === 0}
                  onClick={() =>
                    action("generate", async () => {
                      const r = await api<{ content: string }>(
                        `/api/sessions/${code}/review`,
                        "POST",
                      );
                      setDraft(r.content);
                      setDirty(true);
                      setNotice(
                        "감상평 초안이 준비됐어요. 읽고 수정한 뒤 저장해주세요.",
                      );
                    })
                  }
                >
                  {busy === "generate"
                    ? "우리 반의 생각을 읽고 있어요…"
                    : draft
                      ? "✧ 다시 만들기"
                      : "✧ 우리 반 감상평 만들기"}
                </button>
                <label className="review-label">
                  선생님이 다듬는 감상평
                  <textarea
                    value={draft}
                    maxLength={3000}
                    rows={8}
                    placeholder="생각이 모이면 감상평을 만들 수 있어요. 직접 작성해도 좋아요."
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setDirty(true);
                    }}
                  />
                </label>
                <div className="review-actions">
                  <small>
                    {dirty
                      ? "아직 저장하지 않은 내용이 있어요."
                      : data.review
                        ? "저장된 감상평이에요."
                        : "검토하고 저장하면 학습지에 담겨요."}
                  </small>
                  <button
                    className="primary"
                    disabled={!!busy || blocked || !draft.trim() || !dirty}
                    onClick={() =>
                      action("save", async () => {
                        await api(`/api/sessions/${code}/review`, "PUT", {
                          content: draft,
                        });
                        setDirty(false);
                        await refresh();
                        setNotice("우리 반 감상평을 저장했어요.");
                      })
                    }
                  >
                    {busy === "save" ? "저장 중…" : "저장"}
                  </button>
                </div>
              </section>
            </div>
            <details className="card reflections">
              <summary>익명 상상 이야기 · {data.reflections.length}개</summary>
              <div>
                {data.reflections.map((r, i) => (
                  <p key={i}>“{r}”</p>
                ))}
              </div>
            </details>
            <ClassMusic
              code={code}
              disabled={!!busy || blocked || !data.frequencies.length}
              dirty={dirty}
            />
            <section className="pdf-banner">
              <div>
                <h2>오늘의 감상을, 한 장의 기록으로</h2>
                <p>
                  감상구름과 저장된 감상평, 나의 비교 감상 문항을 학습지로
                  담아요.
                </p>
                {dirty && (
                  <small>편집 중인 감상평을 저장한 뒤 다운로드해주세요.</small>
                )}
              </div>
              <button
                className="primary"
                disabled={!!busy || dirty || blocked}
                onClick={() =>
                  action("pdf", async () => {
                    const { downloadWorksheet } = await import("@/lib/pdf");
                    await downloadWorksheet();
                    setNotice("감상 학습지를 내려받았어요.");
                  })
                }
              >
                {busy === "pdf" ? "학습지 만드는 중…" : "↓ 감상 학습지 PDF"}
              </button>
            </section>
            <p className="quiet expiry">
              감상방 종료:{" "}
              {new Date(data.session.expires_at).toLocaleString("ko-KR")} · 이
              브라우저에서 교사 관리를 이어갈 수 있어요.
            </p>
            <Worksheet data={data} />
          </>
        )}
      </main>
    </>
  );
}
