import Link from "next/link";

type Props = {
  surface: "Messages" | "Referrals";
  /** What this room will do when live */
  later: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Honesty ladder for social shells that are not wired yet.
 * Prefer this over fake “live” metrics.
 */
export function SurfaceHonestyBanner({
  surface,
  later,
  primaryHref = "/marketplace",
  primaryLabel = "Browse listings",
  secondaryHref = "/portal",
  secondaryLabel = "Story Pro",
}: Props) {
  return (
    <div
      role="status"
      className="border-b border-hairline bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface))] px-4 py-3 md:px-6"
      data-honesty="not-live"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Not live yet
          </p>
          <p className="mt-0.5 text-sm text-ink">
            <span className="font-semibold">{surface}</span> is a reserved Story
            Home room — {later}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={primaryHref}
            className="inline-flex h-9 items-center rounded-lg bg-gold px-3 text-xs font-bold text-navy"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-xs font-semibold text-ink"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
