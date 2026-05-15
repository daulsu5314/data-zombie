import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "데이터 좀비: 3분의 사투",
  description: "디지털 시민교육 게임 — 개인정보는 한번 퍼지면 지워지지 않는다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
