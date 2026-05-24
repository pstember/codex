import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commerce Copilot Studio",
  description: "Atlas & Co. eCommerce OS demo with Codex-powered insights and campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
