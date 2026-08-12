"use client";

import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
import {
  compareSubjectToFrame,
  type CadEvidenceClaim,
  type EvidenceStrength,
} from "@/lib/shi/cad-evidence";
import { monthlyMortgagePayment, roundCents } from "@/lib/finance";
import type { ShiAreaAnalysis, ShiPropertyDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function strengthClass(s: EvidenceStrength) {
  switch (s) {
    case "strong":
      return "border-emerald-700/40 bg-emerald-600/10 text-emerald-900";
    case "observed":
      return "border-gold/40 bg-gold/10 text-navy";
    case "present":
      return "border-hairline bg-[var(--background)] text-ink";
    case "weak":
      return "border-amber-700/30 bg-amber-500/10 text-amber-950";
    case "absent":
      return "border-hairline bg-[var(--background)] text-[var(--muted)]";
    default:
      return "border-hairline text-[var(--muted)]";
  }
}

function strengthWord(s: EvidenceStrength) {
  switch (s) {
    case "strong":
      return "Strong";
    case "observed":
      return "Observed";
    case "present":
      return "Present";
    case "weak":
      return "Weak";
    case "absent":
      return "Absent";
    default:
      return s;
  }
}

type Props = {
  property: ShiPropertyDetail;
  /** Active Market Frame analysis — optional CAD band context. */
  frameAnalysis?: ShiAreaAnalysis | null;
};

/**
 * Truth lane · CAD evidence + thin illustrative carry.
 * Never shows seller probability or AVM "true value".
 */
export function ShiCadEvidencePanel({ property, frameAnalysis }: Props) {
  const evidence = property.cadEvidence;
  const [ratePct, setRatePct] = useState("6.5");
  const [downPct, setDownPct] = useState("20");
  const [termYears, setTermYears] = useState("30");

  const frameBand = useMemo(
    () => compareSubjectToFrame(property.marketValue, frameAnalysis),
    [property.marketValue, frameAnalysis],
  );

  const scenario = useMemo(() => {
    const price = property.marketValue;
    if (price == null || !Number.isFinite(price) || price <= 0) return null;
    const rate = Number(ratePct);
    const down = Number(downPct);
    const term = Number(termYears);
    if (
      !Number.isFinite(rate) ||
      !Number.isFinite(down) ||
      !Number.isFinite(term) ||
      rate < 0 ||
      down < 0 ||
      down > 100 ||
      term <= 0
    ) {
      return null;
    }
    const downPayment = roundCents((price * down) / 100);
    const principal = roundCents(price - downPayment);
    const pi = roundCents(monthlyMortgagePayment(principal, rate, term));
    return { price, downPayment, principal, pi, rate, down, term };
  }, [property.marketValue, ratePct, downPct, termYears]);

  if (!evidence) return null;

  const claims = evidence.claims;
  const traj = evidence.trajectory;

  return (
    <div className="rounded-xl border border-hairline bg-[var(--background)]/60 p-3">
      <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
        <Scale className="h-3.5 w-3.5" />
        CAD evidence · market context
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
        What county files support — and how strong that support is. Not an AVM.
        Not a sale prediction. CAD market value is an appraisal observation, not
        a list or sale price.
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {claims.map((c) => (
          <ClaimChip key={c.id} claim={c} />
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-ink">{traj.summary}</p>
        {traj.latest ? (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase text-[var(--muted)]">
                Latest CAD
              </p>
              <p className="font-semibold text-ink">
                {money(traj.latest.marketValue)}
                {traj.latest.taxYear > 0 ? (
                  <span className="font-normal text-[var(--muted)]">
                    {" "}
                    · TY {traj.latest.taxYear}
                  </span>
                ) : null}
              </p>
            </div>
            {traj.prior && traj.deltaPct != null ? (
              <div>
                <p className="font-mono text-[9px] font-bold uppercase text-[var(--muted)]">
                  Vs prior year
                </p>
                <p className="font-semibold text-ink">
                  {traj.deltaAbs != null && traj.deltaAbs >= 0 ? "+" : ""}
                  {money(traj.deltaAbs)}
                  <span className="font-normal text-[var(--muted)]">
                    {" "}
                    ({traj.deltaPct >= 0 ? "+" : ""}
                    {traj.deltaPct.toFixed(1)}%)
                  </span>
                </p>
              </div>
            ) : null}
            {traj.landSharePct != null && traj.improvementSharePct != null ? (
              <div className="col-span-2">
                <p className="font-mono text-[9px] font-bold uppercase text-[var(--muted)]">
                  Land / improvements (CAD)
                </p>
                <p className="text-ink">
                  {traj.landSharePct.toFixed(0)}% land ·{" "}
                  {traj.improvementSharePct.toFixed(0)}% improvements
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {traj.points.length >= 2 ? (
          <ul className="mt-1 space-y-0.5 border-l border-hairline pl-2">
            {traj.points.map((p) => (
              <li
                key={p.taxYear}
                className="flex justify-between gap-2 font-mono text-[10px] text-[var(--muted)]"
              >
                <span>TY {p.taxYear}</span>
                <span className="text-ink">{money(p.marketValue)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {frameBand ? (
        <div className="mt-3 rounded-lg border border-hairline px-2.5 py-2">
          <p className="font-mono text-[9px] font-bold uppercase text-gold">
            Vs active market frame
          </p>
          <p className="mt-1 text-xs font-semibold text-ink">{frameBand.summary}</p>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
            {frameBand.note} · {frameBand.valuedParcelCount}/
            {frameBand.parcelCount} valued in frame
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-[var(--muted)]">
          Draw and analyze a Market Frame to compare this parcel to the frame
          CAD median.
        </p>
      )}

      <div className="mt-3 border-t border-hairline pt-3">
        <p className="font-mono text-[9px] font-bold uppercase text-[var(--muted)]">
          Illustrative carry (your assumptions)
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
          Payment math if someone financed the CAD market value. Not a quote.
          Not what the property will sell for.
        </p>
        {scenario ? (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="block text-[9px] font-semibold text-[var(--muted)]">
                Rate %
                <input
                  value={ratePct}
                  onChange={(e) => setRatePct(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-hairline bg-[var(--surface)] px-2 py-1.5 text-xs text-ink"
                  inputMode="decimal"
                />
              </label>
              <label className="block text-[9px] font-semibold text-[var(--muted)]">
                Down %
                <input
                  value={downPct}
                  onChange={(e) => setDownPct(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-hairline bg-[var(--surface)] px-2 py-1.5 text-xs text-ink"
                  inputMode="decimal"
                />
              </label>
              <label className="block text-[9px] font-semibold text-[var(--muted)]">
                Years
                <input
                  value={termYears}
                  onChange={(e) => setTermYears(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-hairline bg-[var(--surface)] px-2 py-1.5 text-xs text-ink"
                  inputMode="numeric"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-ink">
              P&amp;I ≈{" "}
              <span className="font-serif text-lg font-bold">
                {money(scenario.pi)}
              </span>
              <span className="text-[var(--muted)]"> / mo</span>
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              On {money(scenario.price)} CAD value · {money(scenario.downPayment)}{" "}
              down · {money(scenario.principal)} loan · {scenario.rate}% ·{" "}
              {scenario.term} yr
            </p>
          </>
        ) : (
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Needs a CAD market value and valid rate / down / term inputs.
          </p>
        )}
      </div>

      <p className="mt-2 text-[9px] leading-relaxed text-[var(--muted)]">
        {evidence.note}
      </p>
    </div>
  );
}

function ClaimChip({ claim }: { claim: CadEvidenceClaim }) {
  return (
    <span
      title={claim.detail}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
        strengthClass(claim.strength),
      )}
    >
      {strengthWord(claim.strength)} · {claim.label}
    </span>
  );
}
