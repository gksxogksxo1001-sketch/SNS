import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNS Project - 여행의 순간을 기록하다",
  description: "2030 여행자를 위한 간편 기록 및 공유 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
