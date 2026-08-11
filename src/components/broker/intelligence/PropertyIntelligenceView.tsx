"use client";

import Link from "next/link";
import { Map, Search, Shield } from "lucide-react";
import { ShiIcon } from "@/components/brand/ShiIcon";
import { SHI_PRODUCT, SHI_WAVES } from "@/lib/shi/waves";

/**
 * Story Home Intelligence — Property Intelligence shell (Wave SHI-0).
 * Full search/map/research ships in SHI-1+. Listing-form CAD remains MLS-limited.
 */
export function PropertyIntelligenceView() {
  const current = SHI_WAVES[0];
  const upcoming = SHI_WAVES.slice(1);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-6 md:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-gold shadow-sm">
            <ShiIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
              {SHI_PRODUCT.shortName} · Story Pro
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-ink md:text-3xl">
              {SHI_PRODUCT.fullName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {SHI_PRODUCT.positioning} Research properties across East Texas —
              then turn public records into private prospects and seller leads.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Pill
            icon={<Search className="h-4 w-4" />}
            title="Search"
            body="Owner, address, Property ID, legal, county — one system."
          />
          <Pill
            icon={<Map className="h-4 w-4" />}
            title="Research"
            body="Map-centered intelligence. Select areas. Open property records."
          />
          <Pill
            icon={<Shield className="h-4 w-4" />}
            title="Convert"
            body="Save prospects privately. CRM seller leads without retyping."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-hairline bg-[color-mix(in_srgb,var(--gold)_8%,var(--surface))] px-5 py-6">
        <div className="flex items-center gap-2">
          <ShiIcon className="h-5 w-5 text-navy" />
          <h3 className="text-sm font-bold text-ink">
            {current.id} live — {current.name}
          </h3>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{current.goal}</p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Listing upload CAD map stays MLS-limited (tract pin-drop for listings).
          Full market research lives here in SHI.
        </p>
        <p className="mt-4 text-sm font-semibold text-ink">
          Next up: {upcoming[0]?.id} — {upcoming[0]?.name}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Universal search · MapLibre research map · Property Intelligence panel ·
          county freshness
        </p>
      </section>

      <section>
        <h3 className="font-mono text-[11px] font-bold tracking-[0.14em] text-[var(--muted)] uppercase">
          Build waves
        </h3>
        <ol className="mt-3 space-y-3">
          {SHI_WAVES.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-hairline bg-[var(--surface)] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-ink">
                  {w.id} · {w.name}
                </p>
                {w.id === "SHI-0" ? (
                  <span className="rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-bold text-navy uppercase">
                    Current
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                    Planned
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{w.goal}</p>
              <div className="mt-2 grid gap-2 text-[11px] text-[var(--muted)] md:grid-cols-2">
                <p>
                  <span className="font-bold text-ink">Front-end:</span>{" "}
                  {w.frontend.slice(0, 2).join(" · ")}
                </p>
                <p>
                  <span className="font-bold text-ink">Back-end:</span>{" "}
                  {w.backend.slice(0, 2).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-[var(--muted)]">
        Deep link:{" "}
        <Link href="/portal/intelligence" className="font-semibold text-ink underline">
          /portal/intelligence
        </Link>
      </p>
    </div>
  );
}

function Pill({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-[var(--background)] px-4 py-3">
      <div className="flex items-center gap-2 text-ink">
        {icon}
        <p className="text-sm font-bold">{title}</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}
