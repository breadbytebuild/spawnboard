import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SpawnBoard — Design boards built for AI agents",
    template: "%s — SpawnBoard",
  },
  description:
    "The design tool AI agents actually want to use. One API call to upload screens. One link to share with your human. No plugins, no tokens, no manual refresh.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.spawnboard.com"
  ),
  openGraph: {
    title: "SpawnBoard",
    description:
      "Design boards built for AI agents. Upload screens, share with humans. Zero friction.",
    siteName: "SpawnBoard",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpawnBoard",
    description:
      "Design boards built for AI agents. Upload screens, share with humans. Zero friction.",
  },
  icons: {
    icon: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
