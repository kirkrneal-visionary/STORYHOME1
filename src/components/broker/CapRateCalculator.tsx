"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { computeCapRate } from "@/lib/finance";
import { NumberField, ResultRow, pct, toNumber, usd } from "@/components/broker/ui";

export function CapRateCalculator() {
  const [price, setPrice] = useState("1000000");
  const [rent, setRent] = useState("8000");
  const [otherIncome, setOtherIncome] = useState("0");
  const [vacancy, setVacancy] = useState("5");
  const [tax, setTax] = useState("12000");
  const [insurance, setInsurance] = useState("3000");
  const [maintenance, setMaintenance] = useState("5000");
  const [mgmtPct, setMgmtPct] = useState("8");
  const [hoa, setHoa] = useState("0");
  const [utilities, setUtilities] = useState("0");
  const [other, setOther] = useState("2000");

  const result = useMemo(
    () =>
      computeCapRate({
        purchasePrice: toNumber(price),
        monthlyRent: toNumber(rent),
        otherMonthlyIncome: toNumber(otherIncome),
        vacancyRatePct: toNumber(vacancy),
        annualPropertyTax: toNumber(tax),
        annualInsurance: toNumber(insurance),
        annualMaintenance: toNumber(maintenance),
        managementFeePct: toNumber(mgmtPct),
        annualHoa: toNumber(hoa),
        annualUtilities: toNumber(utilities),
        annualOtherExpenses: toNumber(other),
      }),
    [
      price,
      rent,
      otherIncome,
      vacancy,
      tax,
      insurance,
      maintenance,
      mgmtPct,
      hoa,
      utilities,
      other,
    ],
  );

  const capTone =
    result.capRatePct >= 7
      ? "text-teal-soft"
      : result.capRatePct >= 4
        ? "text-gold"
        : "text-[var(--muted)]";

  return (
    <section className="story-surface p-5 md:p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">
            Cap rate &amp; NOI
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Income-approach return — excludes financing (debt service).
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <NumberField
            id="cap-price"
            label="Purchase price"
            prefix="$"
            value={price}
            onChange={setPrice}
            step="1000"
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="cap-rent"
              label="Monthly rent"
              prefix="$"
              value={rent}
              onChange={setRent}
              step="50"
            />
            <NumberField
              id="cap-other-income"
              label="Other income / mo"
              prefix="$"
              value={otherIncome}
              onChange={setOtherIncome}
              step="50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="cap-vacancy"
              label="Vacancy"
              suffix="%"
              value={vacancy}
              onChange={setVacancy}
              step="0.5"
            />
            <NumberField
              id="cap-mgmt"
              label="Management (of EGI)"
              suffix="%"
              value={mgmtPct}
              onChange={setMgmtPct}
              step="0.5"
            />
          </div>

          <p className="pt-1 font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
            Annual operating expenses
          </p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="cap-tax"
              label="Property tax"
              prefix="$"
              value={tax}
              onChange={setTax}
              step="100"
            />
            <NumberField
              id="cap-ins"
              label="Insurance"
              prefix="$"
              value={insurance}
              onChange={setInsurance}
              step="100"
            />
            <NumberField
              id="cap-maint"
              label="Maintenance"
              prefix="$"
              value={maintenance}
              onChange={setMaintenance}
              step="100"
            />
            <NumberField
              id="cap-hoa"
              label="HOA"
              prefix="$"
              value={hoa}
              onChange={setHoa}
              step="100"
            />
            <NumberField
              id="cap-util"
              label="Utilities"
              prefix="$"
              value={utilities}
              onChange={setUtilities}
              step="100"
            />
            <NumberField
              id="cap-other"
              label="Other"
              prefix="$"
              value={other}
              onChange={setOther}
              step="100"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="story-well p-5">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
              Capitalization rate
            </span>
            <p
              className={`mt-1 font-serif text-5xl font-bold tabular-nums ${capTone}`}
            >
              {pct(result.capRatePct)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {usd(result.netOperatingIncome)} NOI ÷{" "}
              {usd(toNumber(price))} price
            </p>

            <div className="mt-4">
              <ResultRow
                label="Gross scheduled income"
                value={usd(result.grossScheduledIncome)}
              />
              <ResultRow
                label="Vacancy loss"
                value={`− ${usd(result.vacancyLoss)}`}
              />
              <ResultRow
                label="Effective gross income"
                value={usd(result.effectiveGrossIncome)}
              />
              <ResultRow
                label="Management fee"
                value={`− ${usd(result.managementFee)}`}
              />
              <ResultRow
                label="Total operating expenses"
                value={`− ${usd(result.totalOperatingExpenses)}`}
              />
              <ResultRow
                label="Net operating income"
                value={usd(result.netOperatingIncome)}
                strong
                accent
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Monthly NOI" value={usd(result.monthlyNoi)} />
            <MiniStat
              label="Effective gross income"
              value={usd(result.effectiveGrossIncome)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="story-well p-3">
      <span className="block font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
        {label}
      </span>
      <span className="mt-1 block font-mono text-sm font-bold tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}
