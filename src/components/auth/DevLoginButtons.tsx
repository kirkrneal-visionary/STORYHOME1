"use client";

/**
 * Local/dev quick login only. This file must not be imported by production
 * bundles — LoginClient loads it behind a NODE_ENV !== "production" gate.
 */

type AuthResult = { ok: true } | { ok: false; error: string };

type Props = {
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function DevLoginButtons({
  signInWithPassword,
  onSuccess,
  onError,
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">
      <p className="font-mono text-[11px] font-bold tracking-wider text-gold uppercase">
        Quick test login
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        One click, no typing — for testing only.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            const r = await signInWithPassword(
              "storyhome.test.owner@gmail.com",
              "DevPass123!",
            );
            if (r.ok) onSuccess();
            else onError(r.error);
          }}
          className="h-10 rounded-lg bg-gold px-4 text-sm font-bold text-navy"
        >
          Test Consumer
        </button>
        <button
          type="button"
          onClick={async () => {
            const r = await signInWithPassword(
              "storyhome.test.agent@gmail.com",
              "DevPass123!",
            );
            if (r.ok) onSuccess();
            else onError(r.error);
          }}
          className="h-10 rounded-lg border border-gold px-4 text-sm font-bold text-gold"
        >
          Test Agent (pro)
        </button>
      </div>
    </div>
  );
}
