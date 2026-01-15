import type { Metadata } from 'next';
import 'tw-animate-css';
import './globals.scss';

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
