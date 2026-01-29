import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'tw-animate-css';
import './globals.scss';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Genfeed - AI Content Generation',
  description: 'Visual workflow editor for AI-powered content generation with Replicate',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
