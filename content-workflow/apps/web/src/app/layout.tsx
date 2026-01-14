import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Content Workflow - AI Content Generation",
  description:
    "Visual workflow editor for AI-powered content generation with Replicate",
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
