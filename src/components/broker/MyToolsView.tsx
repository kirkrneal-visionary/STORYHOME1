"use client";

import { AmortizationCalculator } from "@/components/broker/AmortizationCalculator";
import { CapRateCalculator } from "@/components/broker/CapRateCalculator";

export function MyToolsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">My Tools</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Client-ready calculators. Numbers update live as you type — share the
          results in your next buyer or seller conversation.
        </p>
      </div>
      <AmortizationCalculator />
      <CapRateCalculator />
    </div>
  );
}
