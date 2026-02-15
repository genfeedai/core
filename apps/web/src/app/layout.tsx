import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './tw-animate.css';
import './globals.scss';

const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  description: 'Visual workflow editor for AI-powered content generation with Replicate',
  title: 'Genfeed - AI Content Generation',
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
