"use client";

import { useEffect, useState } from "react";
import type { LabsRole } from "@/lib/labs/env";
import { applyLabsArchieOverlay } from "@/lib/labs/archie-overlay";
import {
  DEFAULT_LABS_SIMULATION,
  LABS_ACCOUNT_STATES,
  LABS_ARCHIE_STATES,
  LABS_DEVICES,
  LABS_MAP_STATES,
  LABS_PAYMENT_STATES,
  LABS_PERSONAS,
  LABS_SELLER_STATES,
  type LabsSimulation,
} from "@/lib/labs/simulation";
import type { ObservationReadiness } from "@/lib/shi/observation-readiness";

type Status = {
  env: string;
  isolated: boolean;
  isolation: { code: string; message: string }[];
  supabaseHost: string | null;
  role: LabsRole;
  canApprove: boolean;
  commit: string | null;
  branch: string | null;
  vercelEnv: string | null;
  simulation: LabsSimulation;
  jobs: { id: string; name: string; class: string; note: string }[];
  paymentConnected: boolean;
};

const SAMPLE_READY: ObservationReadiness = {
  source: "polk_cad",
  status: "quiet",
  statusLabel: "No change observed",
  detail: "County is current.",
  health: "current",
  eventsTableAvailable: true,
  absentColumnAvailable: true,
  trackingStarted: true,
  eventCount: 0,
  lastEventAt: null,
  countyName: "Polk County",
  lastPullAt: new Date().toISOString(),
  lastAttemptAt: new Date().toISOString(),
  lastError: null,
  ingestCapped: false,
  parcelCount: 57587,
  pullStale: false,
  nextStep: null,
};

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
        {label}
      </span>
      <select
        className="story-press w-full rounded-lg border border-[var(--glass-border)] bg-[var(--env-1)] px-3 py-2 text-sm text-[var(--ink-1)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FounderQaConsole({
  role,
  email,
}: {
  role: LabsRole;
  email: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [sim, setSim] = useState<LabsSimulation>(DEFAULT_LABS_SIMULATION);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/internal/qa", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load Story Labs status.");
        return r.json() as Promise<Status>;
      })
      .then((s) => {
        setStatus(s);
        setSim(s.simulation);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function save() {
    setSaved(false);
    const r = await fetch("/api/internal/qa/simulate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sim),
    });
    if (!r.ok) {
      setError("Could not save this session.");
      return;
    }
    setSaved(true);
  }

  const overlay = applyLabsArchieOverlay(SAMPLE_READY, sim.archie, true);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/80">
        Story Labs · Founder QA
      </p>
      <h1 className="mt-2 font-serif text-4xl text-[var(--ink-1)]">Release cockpit</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-3)]">
        Inspect Story Home under controlled conditions. This page never appears
        in production. Simulations stay in this browser session and cannot touch
        the live vault.
      </p>
      <p className="mt-2 text-xs text-[var(--ink-3)]">
        Signed in as {email} · {role}
      </p>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <section className="story-glass mt-8 rounded-2xl p-5">
        <h2 className="font-serif text-xl text-[var(--ink-1)]">Release</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              Environment
            </dt>
            <dd>{status?.env ?? "…"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              Isolated from production
            </dt>
            <dd>{status ? (status.isolated ? "Yes" : "No — blocked") : "…"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              Commit
            </dt>
            <dd className="break-all font-mono text-xs">{status?.commit ?? "local"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
              Branch
            </dt>
            <dd>{status?.branch ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[var(--ink-3)]">
          Ready for production only after isolated Labs QA, tests, and founder
          approval on GitHub. This screen does not deploy.
        </p>
        {status?.canApprove ? (
          <p className="mt-3 text-sm text-amber-100/90">
            You are the founder on this list. Merge to{" "}
            <span className="font-medium">main</span> is the real release gate.
          </p>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-3)]">
            Developers cannot promote production from this console.
          </p>
        )}
      </section>

      <section className="story-glass mt-6 rounded-2xl p-5">
        <h2 className="font-serif text-xl text-[var(--ink-1)]">Session simulation</h2>
        <p className="mt-2 text-sm text-[var(--ink-3)]">
          Applies to this browser only. Staging data only. Mutating actions stay
          in Story Labs.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Persona"
            value={sim.persona}
            options={LABS_PERSONAS}
            onChange={(v) => setSim({ ...sim, persona: v as LabsSimulation["persona"] })}
          />
          <Field
            label="Account"
            value={sim.account}
            options={LABS_ACCOUNT_STATES}
            onChange={(v) => setSim({ ...sim, account: v as LabsSimulation["account"] })}
          />
          <Field
            label="Archie"
            value={sim.archie}
            options={LABS_ARCHIE_STATES}
            onChange={(v) => setSim({ ...sim, archie: v as LabsSimulation["archie"] })}
          />
          <Field
            label="Map"
            value={sim.map}
            options={LABS_MAP_STATES}
            onChange={(v) => setSim({ ...sim, map: v as LabsSimulation["map"] })}
          />
          <Field
            label="Payment (test mode)"
            value={sim.payment}
            options={LABS_PAYMENT_STATES}
            onChange={(v) => setSim({ ...sim, payment: v as LabsSimulation["payment"] })}
          />
          <Field
            label="Seller metrics"
            value={sim.seller}
            options={LABS_SELLER_STATES}
            onChange={(v) => setSim({ ...sim, seller: v as LabsSimulation["seller"] })}
          />
          <Field
            label="Device class"
            value={sim.device}
            options={LABS_DEVICES}
            onChange={(v) => setSim({ ...sim, device: v as LabsSimulation["device"] })}
          />
        </div>
        <button
          type="button"
          className="story-press mt-5 min-h-11 rounded-full bg-amber-200 px-5 text-sm font-medium text-amber-950"
          onClick={() => void save()}
        >
          Save this session
        </button>
        {saved ? (
          <p className="mt-2 text-sm text-amber-100">Saved. Open the product to inspect.</p>
        ) : null}

        <div className="mt-6 rounded-xl border border-[var(--glass-border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
            Archie preview (Phase 2 labels)
          </p>
          <p className="mt-2 font-serif text-lg text-[var(--ink-1)]">{overlay.status}</p>
          <p className="mt-1 text-sm text-[var(--ink-3)]">{overlay.detail}</p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">health: {overlay.health}</p>
        </div>
      </section>

      <section className="story-glass mt-6 rounded-2xl p-5">
        <h2 className="font-serif text-xl text-[var(--ink-1)]">Open the product</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["Marketplace", "/marketplace"],
            ["My Home", "/home"],
            ["Story Pro", "/portal"],
            ["Archie", "/portal/intelligence"],
            ["Seller", "/seller"],
            ["Login", "/login"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="story-press min-h-11 rounded-full border border-[var(--glass-border)] px-4 py-2 text-sm text-[var(--ink-1)]"
            >
              {label}
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--ink-3)]">
          Phone / tablet / desktop still need a real device. This only labels the
          session.
        </p>
      </section>

      <section className="story-glass mt-6 rounded-2xl p-5">
        <h2 className="font-serif text-xl text-[var(--ink-1)]">Background jobs</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {(status?.jobs ?? []).map((job) => (
            <li key={job.id}>
              <span className="font-medium text-[var(--ink-1)]">{job.name}</span>
              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-amber-200/80">
                {job.class.replaceAll("_", " ")}
              </span>
              <p className="text-[var(--ink-3)]">{job.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
