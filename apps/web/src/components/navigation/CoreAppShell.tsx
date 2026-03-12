'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CORE_APPS, type CoreAppId, getCoreAppById } from '@/lib/core-apps';

interface CoreAppShellProps {
  children: React.ReactNode;
  currentApp?: CoreAppId;
  title?: string;
}

export function CoreAppShell({ children, currentApp, title }: CoreAppShellProps) {
  const pathname = usePathname();
  const resolvedApp =
    currentApp ??
    CORE_APPS.find((app) => pathname === app.href || pathname.startsWith(`${app.href}/`))?.id;
  const current = resolvedApp ? getCoreAppById(resolvedApp) : null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="https://cdn.genfeed.ai/assets/branding/logo-white.png"
                alt="Genfeed"
                width={32}
                height={32}
                className="h-8 w-auto"
                unoptimized
              />
              <div className="leading-tight">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Core OSS
                </div>
                <div className="font-semibold">{title ?? current?.label ?? 'Genfeed Core'}</div>
              </div>
            </Link>
          </div>

          <nav className="flex items-center gap-2">
            {CORE_APPS.map((app) => {
              const isActive = current?.id === app.id;

              return (
                <Link
                  key={app.id}
                  href={app.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {app.label}
                </Link>
              );
            })}
          </nav>

          <a
            href="https://genfeed.ai/cloud"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:border-white hover:text-[var(--foreground)]"
          >
            Open Cloud
          </a>
        </div>
      </header>

      {children}
    </div>
  );
}
