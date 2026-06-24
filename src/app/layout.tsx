import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learner-Bot — AI Learning for Kindle",
  description: "Generate structured learning content optimized for Kindle reading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
