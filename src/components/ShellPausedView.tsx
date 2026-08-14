"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  eyebrow: string;
  body: string;
  honesty: string;
  icon: LucideIcon;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Honest “not shipping yet” surface — no fake inbox/board theater.
 */
export function ShellPausedView({
  title,
  eyebrow,
  body,
  honesty,
  icon: Icon,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1rem)] md:pb-10">
      <section className="w-full max-w-lg text-center">
        <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
          {eyebrow}
        </p>
        <div className="story-well mx-auto mt-4 flex h-14 w-14 items-center justify-center">
          <Icon className="h-6 w-6 text-[var(--muted)]" />
        </div>
        <h1 className="mt-4 font-serif text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
          {honesty}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={primaryHref}
            className="story-press inline-flex h-11 items-center rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="inline-flex h-11 items-center rounded-lg border border-hairline px-5 text-sm font-semibold text-ink"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
