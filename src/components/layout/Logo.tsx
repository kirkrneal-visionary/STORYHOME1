import Link from "next/link";
import { Building2 } from "lucide-react";

type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <Link
      href="/marketplace"
      className="group flex items-center gap-2.5 text-ink transition-opacity hover:opacity-90"
      aria-label="Story Home home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--brand-mark-bg)] text-[var(--brand-mark-fg)] shadow-sm transition-transform duration-300 group-hover:scale-[1.03]">
        <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      {!compact && (
        <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-[var(--brand-wordmark)]">
          Story Home
        </span>
      )}
    </Link>
  );
}
