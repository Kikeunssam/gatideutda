"use client";
import { useEffect, useState, useRef } from "react";
import { Header } from "./brand";
import Image from "next/image";
import { api, participantId, messageOf } from "@/lib/client";
import { Session, StudentResponse, STATUS_LABEL } from "@/lib/types";
const listeningPrompts = [
  { title: "첫 느낌", image: "first-feeling.png" },
  { title: "분위기", image: "mood.png" },
  { title: "악기와 소리", image: "instruments-sound.png" },
  { title: "빠르기와 리듬", image: "tempo-rhythm.png" },
  { title: "소리의 변화", image: "sound-change.png" },
  { title: "떠오른 장면", image: "imagined-scene.png" },
];
export function StudentRoom({ code }: { code: string }) {
  const [session, setSession] = useState<Session | null>(null),
    [saved, setSaved] = useState<StudentResponse | null>(null),
    [editing, setEditing] = useState(false),
    [words, setWords] = useState<string[]>([]),
    [word, setWord] = useState(""),
    [reflection, setReflection] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const pid = useRef("");
  useEffect(() => {
    let active = true;
    let initialized = false;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        if (!initialized) {
          pid.current = participantId();
          await api(`/api/sessions/${code}/participants`, "POST", {
            participant_id: pid.current,
          });
          const r = await api<{ response: StudentResponse | null }>(
            `/api/sessions/${code}/responses`,
            "GET",
            undefined,
            pid.current,
          );
          if (active) {
            setSaved(r.response);
            setReady(true);
            initialized = true;
          }
        }
        const r = await api<{ session: Session }>(`/api/sessions/${code}`);
        if (active) {
          setSession(r.session);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(messageOf(e));
          setSession(null);
          initialized = false;
        }
      } finally {
        if (active) timer = setTimeout(load, 2000);
      }
    }
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [code]);
  function add() {
    const w = word.normalize("NFC").trim().replace(/\s+/g, " ");
    if (!w) return;
    if (w.length > 20 || words.length >= 6) {
      setError("핵심 단어는 20자 이내, 최대 6개까지 입력할 수 있어요.");
      return;
    }
    if (words.some((x) => x.toLowerCase() === w.toLowerCase())) {
      setError("같은 단어는 한 번만 입력해주세요.");
      return;
    }
    setWords([...words, w]);
    setWord("");
    setError("");
  }
  return (
    <>
      <Header />
      <main
        className={`student-shell${session?.status === "collecting" && ready && (!saved || editing) ? " student-shell-input" : ""}`}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!session ? (
          <div className="card empty">
            {error
              ? "참여코드와 감상방 상태를 확인해주세요."
              : "감상방에 들어가고 있어요…"}
          </div>
        ) : (
          <>
            <span className={`pill ${session.status}`}>
              {STATUS_LABEL[session.status]}
            </span>
            <h1>{session.song_title}</h1>
            <p className="subtitle">{session.artist}</p>
            <div className="teacher-message">“{session.teacher_message}”</div>
            {saved && !editing ? (
              <section className="card submitted">
                <Image
                  className="student-art"
                  src="/images/share.png"
                  alt=""
                  width={1254}
                  height={1254}
                  sizes="130px"
                />
                <h2>내 생각이 구름에 더해졌어요!</h2>
                <p>친구들은 어떤 생각을 했을까요?</p>
                <div className="chips">
                  {saved.words.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <p>{saved.reflection}</p>
                {session.status === "collecting" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setWords(saved.words);
                      setReflection(saved.reflection);
                      setEditing(true);
                    }}
                  >
                    수정하기
                  </button>
                )}
              </section>
            ) : session.status === "collecting" && ready ? (
              <form
                className="card form student-response-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    const r = await api<{ response: StudentResponse }>(
                      `/api/sessions/${code}/responses`,
                      saved ? "PUT" : "POST",
                      { words, reflection },
                      pid.current,
                    );
                    setSaved(r.response);
                    setEditing(false);
                  } catch (e) {
                    setError(messageOf(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>
                  이 음악을 들으며 <br />
                  떠오른 생각을 남겨보세요.
                </h2>
                <section
                  className="listening-guide"
                  aria-labelledby="guide-title"
                >
                  <h3 id="guide-title">무엇에 귀 기울여 볼까요?</h3>
                  <p id="word-guide">
                    정답은 없어요. 떠오르는 단어를 6개 적어요.
                  </p>
                  <dl>
                    {listeningPrompts.map(({ title, image }) => (
                      <div key={title}>
                        <dt>{title}</dt>
                        <dd>
                          <Image
                            src={`/images/listening-prompts/${image}`}
                            alt={title}
                            width={1280}
                            height={1280}
                            sizes="(max-width: 600px) 110px, 140px"
                            className="listening-prompt-image"
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <div className="student-response-fields">
                  <label className="student-field-title" htmlFor="word">
                    핵심 단어 <small>{words.length} / 6</small>
                  </label>
                  <div className="word-entry">
                    <input
                      id="word"
                      value={word}
                      maxLength={20}
                      disabled={words.length >= 6}
                      aria-describedby="word-guide"
                      placeholder="떠오르는 단어를 하나씩 입력해요"
                      onChange={(e) => setWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          add();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="secondary"
                      disabled={!word.trim() || words.length >= 6}
                      onClick={add}
                    >
                      추가
                    </button>
                  </div>
                  <div className="chips">
                    {words.map((w) => (
                      <button
                        key={w}
                        type="button"
                        aria-label={`${w} 삭제`}
                        onClick={() => setWords(words.filter((x) => x !== w))}
                      >
                        {w} ×
                      </button>
                    ))}
                  </div>
                  <label className="student-field-title" htmlFor="story">
                    음악에 담긴 이야기 상상하기{" "}
                    <small>선택 · {reflection.length}/200</small>
                  </label>
                  <p className="story-guide" id="story-guide">
                    누가, 어디에서, 무엇을 하고 있을까요? 음악이 달라질 때
                    이야기도 어떻게 바뀔지 상상해봐요.
                  </p>
                  <textarea
                    id="story"
                    aria-describedby="story-guide"
                    maxLength={200}
                    rows={4}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="예: 작은 고양이가 달빛 아래 숲길을 걸어요. 음악이 빨라지자 반딧불이를 따라 신나게 달리기 시작했어요."
                  />
                  <p className="quiet">
                    이름이나 연락처 같은 개인정보는 적지 않아요.
                  </p>
                  <button className="primary" disabled={busy || !words.length}>
                    {busy
                      ? "생각을 보내고 있어요…"
                      : saved
                        ? "수정한 생각 보내기"
                        : "내 생각 보내기"}
                  </button>
                </div>
              </form>
            ) : (
              <section className="card waiting">
                <Image
                  className="student-art"
                  src={
                    session.status === "closed"
                      ? "/images/share.png"
                      : "/images/listen.png"
                  }
                  alt=""
                  width={1254}
                  height={1254}
                  sizes="130px"
                />
                <h2>
                  {session.status === "closed"
                    ? "생각 모으기가 끝났어요."
                    : "음악을 귀 기울여 들어보세요."}
                </h2>
                <p>
                  {session.status === "closed"
                    ? "친구들과 우리 반의 감상을 나눠보세요."
                    : "떠오르는 느낌이나 장면을 마음속으로 생각해보세요."}
                </p>
                <div className="wave" aria-hidden="true">
                  {[12, 24, 38, 20, 44, 30, 16, 32, 20].map((h, i) => (
                    <i key={i} style={{ height: h }} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
