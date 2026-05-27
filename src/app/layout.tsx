import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "z-type",
  description: "z-type 是一个面向练字、字体选择与 AI 字体修正的现代化工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
