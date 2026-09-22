import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SettingsCategoryRow({
  href,
  title,
  subtitle,
  id,
  onClick,
  tone = "default",
}: {
  href: string;
  title: string;
  subtitle: string;
  id?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <Link
      id={id}
      href={href}
      onClick={onClick}
      className="story-press story-surface flex min-h-14 w-full items-center gap-3 px-4 py-3 transition-colors motion-reduce:transition-none hover:bg-[color-mix(in_srgb,var(--surface)_88%,var(--paper))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <span className="min-w-0 flex-1 text-left">
        <span
          className={
            tone === "danger"
              ? "type-card-title block text-red-300"
              : "type-card-title block text-ink"
          }
        >
          {title}
        </span>
        <span className="type-meta mt-0.5 block break-words text-[var(--muted)]">{subtitle}</span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-[var(--muted)]"
        aria-hidden="true"
      />
    </Link>
  );
}
