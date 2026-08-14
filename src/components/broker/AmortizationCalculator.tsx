"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { computeAmortization } from "@/lib/finance";
import { NumberField, ResultRow, toNumber, usd } from "@/components/broker/ui";

const TERMS = [30, 20, 15, 10];

export function AmortizationCalculator() {
  const [homePrice, setHomePrice] = useState("375000");
  const [downPayment, setDownPayment] = useState("75000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [propertyTax, setPropertyTax] = useState("6000");
  const [insurance, setInsurance] = useState("1800");
  const [hoa, setHoa] = useState("0");
  const [pmiPct, setPmiPct] = useState("0.5");
  const [showSchedule, setShowSchedule] = useState(false);

  const priceNum = toNumber(homePrice);
  const downNum = toNumber(downPayment);
  const downPct = priceNum > 0 ? (downNum / priceNum) * 100 : 0;

  const result = useMemo(
    () =>
      computeAmortization({
        homePrice: priceNum,
        downPayment: downNum,
        annualRatePct: toNumber(rate),
        termYears: toNumber(term),
        annualPropertyTax: toNumber(propertyTax),
        annualHomeInsurance: toNumber(insurance),
        monthlyHoa: toNumber(hoa),
        annualPmiPct: toNumber(pmiPct),
      }),
    [priceNum, downNum, rate, term, propertyTax, insurance, hoa, pmiPct],
  );

  return (
    <section className="story-surface p-5 md:p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]">
          <Calculator className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">
            Mortgage &amp; amortization
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Fixed-rate principal &amp; interest with full PITI breakdown.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <NumberField
            id="amort-price"
            label="Home price"
            prefix="$"
            value={homePrice}
            onChange={setHomePrice}
            step="1000"
          />
          <NumberField
            id="amort-down"
            label="Down payment"
            prefix="$"
            value={downPayment}
            onChange={setDownPayment}
            step="1000"
            hint={`${downPct.toFixed(1)}% down${downPct < 20 ? " · PMI applies below 20%" : " · no PMI"}`}
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="amort-rate"
              label="Interest rate"
              suffix="%"
              value={rate}
              onChange={setRate}
              step="0.05"
            />
            <label htmlFor="amort-term" className="block">
              <span className="block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
                Loan term
              </span>
              <select
                id="amort-term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="field-input mt-1.5"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t} years
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="amort-tax"
              label="Property tax / yr"
              prefix="$"
              value={propertyTax}
              onChange={setPropertyTax}
              step="100"
            />
            <NumberField
              id="amort-ins"
              label="Insurance / yr"
              prefix="$"
              value={insurance}
              onChange={setInsurance}
              step="100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="amort-hoa"
              label="HOA / mo"
              prefix="$"
              value={hoa}
              onChange={setHoa}
              step="10"
            />
            <NumberField
              id="amort-pmi"
              label="PMI rate / yr"
              suffix="%"
              value={pmiPct}
              onChange={setPmiPct}
              step="0.05"
              hint="Applied while under 20% equity"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="story-well p-5">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
              Estimated monthly payment
            </span>
            <p className="mt-1 font-serif text-4xl font-bold text-ink tabular-nums">
              {usd(result.monthlyTotal, true)}
            </p>

            <div className="mt-4">
              <ResultRow
                label="Principal & interest"
                value={usd(result.monthlyPrincipalInterest, true)}
              />
              <ResultRow
                label="Property tax"
                value={usd(result.monthlyPropertyTax, true)}
              />
              <ResultRow
                label="Home insurance"
                value={usd(result.monthlyHomeInsurance, true)}
              />
              {result.monthlyHoa > 0 && (
                <ResultRow label="HOA dues" value={usd(result.monthlyHoa, true)} />
              )}
              {result.monthlyPmi > 0 && (
                <ResultRow label="PMI" value={usd(result.monthlyPmi, true)} />
              )}
              <ResultRow
                label="Total monthly"
                value={usd(result.monthlyTotal, true)}
                strong
                accent
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat label="Loan amount" value={usd(result.loanAmount)} />
            <MiniStat label="Total interest" value={usd(result.totalInterest)} />
            <MiniStat
              label="Total of payments"
              value={usd(result.totalOfPayments)}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowSchedule((s) => !s)}
            className="mt-4 self-start text-xs font-semibold text-gold hover:underline"
          >
            {showSchedule ? "Hide" : "Show"} yearly amortization schedule
          </button>
        </div>
      </div>

      {showSchedule && result.schedule.length > 0 && (
        <div className="story-well mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-[var(--background)] font-mono text-[11px] uppercase text-[var(--muted)]">
                <th className="px-4 py-2 font-semibold">Year</th>
                <th className="px-4 py-2 text-right font-semibold">Principal</th>
                <th className="px-4 py-2 text-right font-semibold">Interest</th>
                <th className="px-4 py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {result.schedule.map((row) => (
                <tr
                  key={row.year}
                  className="border-b border-hairline last:border-0"
                >
                  <td className="px-4 py-2 font-mono text-xs text-[var(--muted)]">
                    {row.year}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-ink">
                    {usd(row.principalPaid)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-ink">
                    {usd(row.interestPaid)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-ink">
                    {usd(row.endingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
