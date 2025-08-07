import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import EpisodeListPanel from '@/components/layout/EpisodeListPanel';
import ReferenceCardPanel from '@/components/layout/ReferenceCardPanel';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'draft_sandpaper',
  description: 'AI-powered writing assistant for webnovel authors',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-900 text-gray-100`}>
        <EpisodeListPanel />
        <ReferenceCardPanel />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
