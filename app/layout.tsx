import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ".verse — Pay people, not addresses",
  description:
    "Send USDC and VERSE to verified .verse names and social handles on Polygon.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
