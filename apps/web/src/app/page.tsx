import Link from 'next/link';
import { ArrowRight, Boxes, Clapperboard, Sparkles } from 'lucide-react';
import { CoreAppShell } from '@/components/navigation/CoreAppShell';
import { CORE_APPS } from '@/lib/core-apps';

const ICONS = {
  editor: Clapperboard,
  studio: Sparkles,
  workflows: Boxes,
} as const;

export default function HomePage() {
  return (
    <CoreAppShell title="Choose a Surface">
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            Genfeed Core
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build, generate, and edit in one self-hosted creation app.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--muted-foreground)]">
            Workflows gives you pipelines, Studio gives you fast prompt-bar generation, and Editor
            turns generated assets into finished compositions.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CORE_APPS.map((app) => {
            const Icon = ICONS[app.id];

            return (
              <Link
                key={app.id}
                href={app.href}
                className="group rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 transition hover:border-white"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-[var(--secondary)] p-3">
                    <Icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-[var(--muted-foreground)] transition group-hover:text-[var(--foreground)]" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold">{app.label}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {app.description}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </CoreAppShell>
  );
}
