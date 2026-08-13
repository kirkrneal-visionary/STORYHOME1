"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import {
  compareSubjectToFrame,
  compareSubjectToLookalikes,
  type CadEvidenceClaim,
  type CadLookalikeBand,
  type EvidenceStrength,
} from "@/lib/shi/cad-evidence";
import { shiFindSimilar } from "@/lib/shi/client";
import type { ShiAreaAnalysis, ShiPropertyDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";
import { ShiIntelligenceScenarioBoard } from "@/components/broker/intelligence/ShiIntelligenceScenarioBoard";

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
 * Truth lane · CAD evidence + lookalike band + assumption ranges.
 * Never shows seller probability or AVM "true value".
 */
export function ShiCadEvidencePanel({ property, frameAnalysis }: Props) {
  const evidence = property.cadEvidence;
  const [lookalike, setLookalike] = useState<CadLookalikeBand | null>(null);
  const [lookalikeLoading, setLookalikeLoading] = useState(false);
  const [lookalikeError, setLookalikeError] = useState("");
  const [lookalikeNote, setLookalikeNote] = useState("");

  const frameBand = useMemo(
    () => compareSubjectToFrame(property.marketValue, frameAnalysis),
    [property.marketValue, frameAnalysis],
  );

  const loadLookalikes = useCallback(async () => {
    if (
      property.centroidLat == null ||
      property.centroidLng == null ||
      !Number.isFinite(property.centroidLat) ||
      !Number.isFinite(property.centroidLng)
    ) {
      setLookalike(null);
      setLookalikeError("No map centroid — lookalike band needs a located parcel.");
      return;
    }
    setLookalikeLoading(true);
    setLookalikeError("");
    try {
      const result = await shiFindSimilar({
        source: property.source,
        propId: property.propId,
        limit: 20,
      });
      const band = compareSubjectToLookalikes(
        property.marketValue,
        result.matches.map((m) => m.marketValue),
      );
      setLookalike(band);
      setLookalikeNote(result.note);
      if (!band) {
        setLookalikeError(
          result.matches.length === 0
            ? "No lookalike CAD matches in range yet."
            : "Lookalike matches lack CAD market values.",
        );
      }
    } catch (e) {
      setLookalike(null);
      setLookalikeError(
        e instanceof Error ? e.message : "Could not load lookalike band",
      );
    } finally {
      setLookalikeLoading(false);
    }
  }, [
    property.centroidLat,
    property.centroidLng,
    property.marketValue,
    property.propId,
    property.source,
  ]);

  useEffect(() => {
    setLookalike(null);
    setLookalikeError("");
    setLookalikeNote("");
    const t = window.setTimeout(() => {
      void loadLookalikes();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadLookalikes]);

  if (!evidence) return null;

  const claims = evidence.claims;
  const traj = evidence.trajectory;
  const taxYearCount = traj.points.length;

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

      <div className="mt-3 rounded-lg border border-hairline px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[9px] font-bold uppercase text-gold">
            Lookalike CAD band
          </p>
          <button
            type="button"
            onClick={() => void loadLookalikes()}
            disabled={lookalikeLoading}
            className="text-[10px] font-bold text-gold disabled:opacity-50"
          >
            {lookalikeLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
        {lookalikeLoading ? (
          <div className="mt-2 flex justify-center text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : lookalike ? (
          <>
            <p className="mt-1 text-xs font-semibold text-ink">
              {lookalike.summary}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
              Median {money(lookalike.median)} · range {money(lookalike.min)}–
              {money(lookalike.max)} · {lookalike.valuedCount}/
              {lookalike.matchCount} valued
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {lookalike.note}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            {lookalikeError ||
              "Load lookalike CAD matches to compare this parcel’s appraisal band."}
          </p>
        )}
        {lookalikeNote && lookalike ? (
          <p className="mt-1 text-[9px] text-[var(--muted)]">{lookalikeNote}</p>
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

      <ShiIntelligenceScenarioBoard
        subjectCadValue={property.marketValue}
        taxYearCount={taxYearCount}
        lookalike={lookalike}
      />

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
