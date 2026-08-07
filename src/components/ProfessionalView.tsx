"use client";

import { ArrowUpRight, Award, Layers, Plus } from "lucide-react";
import { DEMO_AGENT, DEMO_REFERRAL } from "@/lib/demo-data";

export default function ProfessionalView() {
  return (
    <div className="min-h-screen bg-white pb-16 pt-[72px] md:pb-0">
      {/* PERFORMANCE METRICS TOP STRIP */}
      <section className="border-b border-hairline bg-slate-50/50 px-6 py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard
            icon={<Award className="h-6 w-6" />}
            iconWrap="bg-teal-50 text-teal-accent"
            label="Reputation Score"
            value={String(DEMO_AGENT.reputationScore)}
            trend="+2%"
          />
          <MetricCard
            icon={<Layers className="h-6 w-6" />}
            iconWrap="bg-amber-50 text-gold"
            label="Open Network Leads"
            value="12"
          />
          <MetricCard
            icon={<Plus className="h-6 w-6" />}
            iconWrap="bg-blue-50 text-navy"
            label="Active Listings"
            value="4"
          />
        </div>
      </section>

      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl font-bold text-navy">
              Referral Distribution Board
            </h2>
            <p className="mt-0.5 font-sans text-sm text-slate-500">
              B2B client distribution marketplace tracking network contracts
            </p>
          </div>
          <button
            type="button"
            className="flex h-11 items-center gap-2 self-start rounded-lg bg-teal-accent px-5 font-sans text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0c3330] md:self-auto"
          >
            <Plus className="h-4 w-4" /> Post New Referral Opportunity
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 font-sans lg:grid-cols-3">
          {/* OPEN PIPELINE */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-bold tracking-wider text-navy uppercase">
                Open Lead Pipeline
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">
                1
              </span>
            </div>

            <div className="space-y-4 rounded-lg border border-hairline bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="block font-mono text-[11px] font-bold text-slate-400 uppercase">
                    Target Destination
                  </span>
                  <span className="font-serif text-lg font-bold text-navy">
                    {DEMO_REFERRAL.targetMarket}
                  </span>
                </div>
                <span className="rounded bg-navy px-2 py-0.5 font-mono text-xs font-bold text-white">
                  {DEMO_REFERRAL.budgetRange}
                </span>
              </div>

              <div>
                <span className="block font-mono text-[11px] font-bold text-slate-400 uppercase">
                  Lead Criteria Context
                </span>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-text">
                  {DEMO_REFERRAL.clientDescription}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-hairline pt-3">
                <div>
                  <span className="block font-mono text-[10px] text-slate-400 uppercase">
                    Contract Terms
                  </span>
                  <span className="text-xs font-bold text-teal-accent">
                    25% Co-Broker Split
                  </span>
                </div>
                <button
                  type="button"
                  className="h-8 rounded bg-gold px-4 text-xs font-semibold text-navy transition-colors hover:bg-amber-400"
                >
                  Claim Lead
                </button>
              </div>
            </div>
          </div>

          {/* CLAIMED */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 opacity-60">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded bg-teal-accent px-2 py-1 text-xs font-bold tracking-wider text-white uppercase">
                Claimed / Escrow
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">
                0
              </span>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-medium text-slate-400">
              No leads currently tracking in escrow
            </div>
          </div>

          {/* ARCHIVE */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 opacity-60">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold tracking-wider text-slate-500 uppercase">
                Closed Archive
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">
                0
              </span>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-medium text-slate-400">
              Archive records are empty
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  iconWrap,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  iconWrap: string;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-hairline bg-white p-4">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconWrap}`}
      >
        {icon}
      </div>
      <div>
        <span className="block text-xs font-medium tracking-wider text-slate-400 uppercase">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl font-bold text-navy">{value}</span>
          {trend && (
            <span className="flex items-center font-mono text-xs font-bold text-emerald-600">
              <ArrowUpRight className="h-3 w-3" /> {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
