import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SettingsCategoryRow({
  href,
  title,
  subtitle,
  id,
  onClick,
}: {
  href: string;
  title: string;
  subtitle: string;
  id?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      id={id}
      href={href}
      onClick={onClick}
      className="story-surface flex min-h-14 w-full items-center gap-3 px-4 py-3 transition-colors motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--paper))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <span className="min-w-0 flex-1 text-left">
        <span className="type-card-title block text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">{subtitle}</span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[var(--muted)]"
        aria-hidden="true"
      />
    </Link>
  );
}
