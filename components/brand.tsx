import Link from "next/link";
import Image from "next/image";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="같이듣다 홈">
      <Image
        className="brand-logo"
        src="/images/main-logo.png"
        alt="같이듣다 · 함께 듣는 음악 감상실"
        width={180}
        height={90}
        preload
      />
    </Link>
  );
}
export function Header({ teacher = false }: { teacher?: boolean }) {
  return (
    <header className="site-header">
      <Brand />
      {teacher ? (
        <a
          className="developer-link"
          href="https://litt.ly/kikeunssam"
          target="_blank"
          rel="noopener noreferrer"
        >
          개발자 문의 ↗
        </a>
      ) : (
        <span className="header-note">
          음악으로 연결되는 우리 반 <span>✦</span>
        </span>
      )}
    </header>
  );
}
