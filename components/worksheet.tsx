import type { Dashboard } from "@/lib/types";
import Image from "next/image";
import { Cloud } from "./cloud";
function SheetHeader({ page }: { page: number }) {
  return (
    <header className="sheet-header">
      <Image
        className="sheet-logo"
        src="/images/main-logo.png"
        alt="같이듣다"
        width={150}
        height={75}
        unoptimized
        loading="eager"
      />
      <div className="sheet-header-note">
        <span>나의 생각과 너의 생각이 만나는 시간</span>
        <b>
          음악 감상 노트 <i>{String(page).padStart(2, "0")}</i>
        </b>
      </div>
    </header>
  );
}
function Identity() {
  return (
    <p className="sheet-identity">
      ____학년 ____반 ____번 <span>이름 __________</span>
    </p>
  );
}
function SectionTitle({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="sheet-section-title">
      <span>{number}</span>
      {children}
    </h2>
  );
}
export function Worksheet({ data }: { data: Dashboard }) {
  return (
    <div className="worksheet-stack" aria-hidden="true">
      <article className="worksheet" data-pdf-page>
        <SheetHeader page={1} />
        <div className="worksheet-top">
          <h1>
            우리 반 음악 감상 기록 <span className="sheet-spark">✦</span>
          </h1>
          <Identity />
        </div>
        <section className="sheet-song">
          <div>
            <SectionTitle number="01">오늘 함께 들은 음악</SectionTitle>
            <h3>{data.session.song_title}</h3>
            <p>{data.session.artist || "작곡가 / 아티스트: —"}</p>
          </div>
          <Image
            src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
            data-youtube-qr={`https://www.youtube.com/watch?v=${data.session.youtube_video_id}`}
            className="sheet-youtube-qr"
            alt="함께 감상한 YouTube 영상 QR 코드"
            width={86}
            height={86}
            unoptimized
            loading="eager"
          />
        </section>
        <section className="sheet-cloud">
          <SectionTitle number="02">우리 반 감상구름</SectionTitle>
          <Cloud words={data.frequencies} scale={0.75} />
        </section>
        <section>
          <SectionTitle number="03">우리 반에서 많이 나온 생각</SectionTitle>
          <div className="worksheet-topwords">
            {data.frequencies.slice(0, 10).map((w) => (
              <span key={w.word}>
                {w.word} <b>{w.count}</b>
              </span>
            ))}
          </div>
        </section>
        <section className="sheet-review">
          <SectionTitle number="04">우리 반 종합 감상평</SectionTitle>
          <p className="worksheet-review">
            {data.review || "우리 반의 감상평을 선생님과 함께 적어보세요."}
          </p>
        </section>
        <footer>
          <span>♫ 같은 음악, 저마다의 생각</span>
          <span>함께 듣고, 함께 자라요 · 1</span>
        </footer>
      </article>
      <article className="worksheet" data-pdf-page>
        <SheetHeader page={2} />
        <div className="worksheet-top">
          <h1>
            나의 비교 감상 <span className="sheet-spark">✦</span>
          </h1>
        </div>
        {[
          "이 음악에서 가장 인상 깊었던 부분은 무엇인가요?",
          "우리 반 친구들과 생각이 비슷했던 점은 무엇인가요?",
          "우리 반 친구들과 생각이 달랐던 점은 무엇인가요?",
          "친구들의 생각을 본 뒤 음악을 다시 들었을 때 새롭게 느낀 점을 적어봅시다.",
        ].map((q, i) => (
          <section className="question" key={q}>
            <SectionTitle number={String(i + 1).padStart(2, "0")}>
              {q}
            </SectionTitle>
            <div className="writing-lines" />
          </section>
        ))}
        <footer>
          <span>♡ 서로의 생각을 들으며 감상을 넓혀요</span>
          <span>나만의 감상 기록 · 2</span>
        </footer>
      </article>
    </div>
  );
}
