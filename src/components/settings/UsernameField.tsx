"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AtSign, Save } from "lucide-react";
import { SettingsCard } from "@/components/settings/SettingsCard";
import {
  demoUsernameClient,
  liveUsernameClient,
  type UsernameClient,
} from "@/lib/account/username-client";
import { shapeUsernameInput } from "@/lib/account/username";
import {
  USERNAME_DEBOUNCE_MS,
  canSaveUsername,
  ownCooldownCopy,
  phaseAfterAvailability,
  phaseAfterClaim,
  shouldCheckAvailability,
  usernameStatusCopy,
  usernameSyntax,
  type UsernameUiPhase,
} from "@/lib/account/username-settings";
import type { UsernameClaimResponse } from "@/lib/account/username-api";
import { cn } from "@/lib/utils";

export function UsernameField({
  userId,
  demo = false,
  client,
}: {
  userId: string;
  demo?: boolean;
  client?: UsernameClient;
}) {
  const inputId = useId();
  const statusId = useId();
  const resolved = useMemo(
    () => client ?? (demo ? demoUsernameClient(userId) : liveUsernameClient()),
    [client, demo, userId],
  );
  const [current, setCurrent] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<UsernameUiPhase>("idle");
  const [claim, setClaim] = useState<UsernameClaimResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void resolved.loadCurrent().then((name) => {
      if (cancelled) return;
      setCurrent(name);
      setValue(name ?? "");
      setPhase(name ? "current" : "idle");
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [resolved, userId]);

  const syntax = usernameSyntax(value);
  const changing = Boolean(current && value && value !== current);

  useEffect(() => {
    if (!loaded) return;
    if (current && value === current) {
      setPhase("current");
      return;
    }
    if (!shouldCheckAvailability({ shaped: value, syntax, current })) {
      setPhase(syntax ? "invalid" : "idle");
      return;
    }
    const seq = ++requestSeq.current;
    setPhase("checking");
    const handle = window.setTimeout(() => {
      void resolved
        .checkAvailability(value)
        .then((result) => {
          if (seq !== requestSeq.current) return;
          setPhase(phaseAfterAvailability({ shaped: value, current, syntax, result }));
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          setPhase("error");
          setClaim({ ok: false, error: "Couldn't check that username. Try again." });
        });
    }, USERNAME_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, syntax, current, loaded, resolved]);

  const status = usernameStatusCopy({
    phase,
    syntax,
    shaped: value,
    claim:
      phase === "cooldown" && claim?.retryAfter
        ? { ...claim, error: ownCooldownCopy(claim.retryAfter) }
        : claim,
  });
  const canSave = canSaveUsername({ shaped: value, syntax, phase, saving });

  async function onSave() {
    if (saving) return;
    setSaving(true);
    setClaim(null);
    try {
      const result = await resolved.claim(value);
      setClaim(result);
      const next = phaseAfterClaim(result);
      setPhase(next);
      if (result.ok && result.normalized) {
        setCurrent(result.normalized);
        setValue(result.normalized);
      }
    } catch {
      setPhase("error");
      setClaim({ ok: false, error: "Couldn't save that username. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      icon={AtSign}
      title="Username"
      subtitle={current ? `@${current}` : "Choose a public @username."}
    >
      <div className="space-y-3">
        <label htmlFor={inputId} className="block">
          <span className="type-control block text-[var(--muted)]">Username</span>
          <div className="mt-1.5 flex min-w-0 w-full">
            <span
              aria-hidden="true"
              className="field-input inline-flex w-10 shrink-0 items-center justify-center rounded-r-none border-r-0 px-0 font-semibold text-[var(--muted)]"
            >
              @
            </span>
            <input
              id={inputId}
              name="username"
              type="text"
              value={value}
              onChange={(e) => {
                setClaim(null);
                setValue(shapeUsernameInput(e.target.value));
              }}
              placeholder=""
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              aria-invalid={status.tone === "bad"}
              aria-describedby={statusId}
              className="field-input min-w-0 flex-1 rounded-l-none"
            />
          </div>
        </label>

        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={cn(
            "min-h-10 text-sm",
            status.tone === "ok" && "text-teal-soft",
            status.tone === "bad" && "text-red-300",
            status.tone === "muted" && "text-[var(--muted)]",
          )}
        >
          {status.text}
        </p>

        {current ? (
          <p
            className={cn(
              "min-h-8 text-xs text-[var(--muted)]",
              !changing && "invisible",
            )}
          >
            Your previous username will remain unavailable after you change it.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!canSave}
          onClick={() => void onSave()}
          className="story-press inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save username"}
        </button>
      </div>
    </SettingsCard>
  );
}
