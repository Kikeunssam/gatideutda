import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "같이듣다 · 함께 듣는 음악 감상실",
  description: "음악을 함께 듣고, 우리 반의 생각을 모아보세요.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <footer className="footer">
          같은 음악, 저마다의 생각. 함께라서 더 풍부한 감상.
          <p>© 2026 키큰쌤. All rights reserved.</p>
          <p>
            YouTube 링크를 통해 감상하는 음원·영상의 저작권 및 관련 권리는 각
            권리자에게 있습니다.
          </p>
        </footer>
      </body>
    </html>
  );
}
