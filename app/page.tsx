import Link from "next/link";
import { Header } from "@/components/brand";
import Image from "next/image";
export default function Home() {
  return (
    <>
      <Header />
      <main className="home">
        <h1 className="sr-only">같이듣다 · 함께 듣는 음악 감상실</h1>
        <p className="hero-copy">
          음악을 함께 듣고, 우리 반의 생각을 모아보세요.
          <br />
          작은 단어 하나가 모여, 우리만의 감상이 됩니다.
        </p>
        <div className="journey">
          {[
            {
              kind: "listen",
              title: "함께 듣기",
              desc: "하나의 음악에 귀 기울여요",
              color: "blue",
            },
            {
              kind: "think",
              title: "생각 모으기",
              desc: "떠오르는 생각을 남겨요",
              color: "yellow",
            },
            {
              kind: "share",
              title: "감상 나누기",
              desc: "우리 반의 느낌을 만나요",
              color: "mint",
            },
            {
              kind: "create",
              title: "새롭게 만들기",
              desc: "우리 반 생각으로 음악을 만들어요",
              color: "pink",
            },
          ].map((x, i) => (
            <div className={`journey-card ${x.color}`} key={x.kind}>
              <span className="step">0{i + 1}</span>
              <Image
                className="journey-art"
                src={`/images/${x.kind}.png`}
                alt=""
                width={1254}
                height={1254}
                sizes="(max-width: 600px) 110px, 130px"
              />
              <h2>{x.title}</h2>
              <p>{x.desc}</p>
            </div>
          ))}
        </div>
        <div className="home-actions">
          <Link className="button primary" href="/teacher/new">
            교사로 시작하기 <span>→</span>
          </Link>
          <Link className="button secondary" href="/join">
            학생 참여하기 <span>→</span>
          </Link>
        </div>
        <p className="quiet">
          학생은 가입 없이, 참여코드만으로 함께할 수 있어요.
        </p>
        <div className="home-bottom">
          <span>♫ 함께 듣는 즐거움</span>
          <span>✧ 정답 없는 감상</span>
          <span>♡ 이름 없이 편하게</span>
        </div>
      </main>
    </>
  );
}
