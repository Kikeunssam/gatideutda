"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/brand";
import Image from "next/image";
import { api, messageOf } from "@/lib/client";
export default function Join() {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <Header />
      <main className="student-shell">
        <Image
          className="student-art"
          src="/images/listen.png"
          alt=""
          width={1254}
          height={1254}
          sizes="130px"
        />
        <h1>함께 들을 준비됐나요?</h1>
        <p className="subtitle">선생님이 알려주신 참여코드를 입력해주세요.</p>
        <form
          className="card form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api(`/api/sessions/${code}`);
              router.push(`/join/${code}`);
            } catch (e) {
              setError(messageOf(e));
              setBusy(false);
            }
          }}
        >
          <label>
            6자리 참여코드
            <input
              className="code-input"
              aria-label="6자리 참여코드"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={6}
              placeholder="A7K3PM"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))
              }
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy || code.length !== 6}>
            {busy ? "감상방을 찾고 있어요…" : "감상방 참여하기 →"}
          </button>
          <p className="quiet">이름도, 회원가입도 필요 없어요.</p>
        </form>
      </main>
    </>
  );
}
