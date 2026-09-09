import type { Metadata } from "next";
import { VerseAuthProvider } from "@/components/verse-auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: ".verse — Pay people, not addresses",
  description:
    "Send USDC and VERSE to verified .verse names and social handles on Polygon.",
  other: {
    "codex-preview": "development",
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: ".verse", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/verse-home.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><VerseAuthProvider>{children}</VerseAuthProvider></body>
    </html>
  );
}
