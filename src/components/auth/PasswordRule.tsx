"use client";

import { Check } from "lucide-react";
import {
  PASSWORD_RULE_COPY,
  meetsPasswordRule,
} from "@/lib/account/password-rule";
import { cn } from "@/lib/utils";

/**
 * The minimum is visible before typing and gets a check mark once met.
 * `rejected` is Supabase's answer on submit (too short, common, or leaked).
 */
export function PasswordRule({
  id,
  password,
  rejected,
}: {
  id: string;
  password: string;
  rejected?: string | null;
}) {
  const met = meetsPasswordRule(password);
  return (
    <div id={id} className="space-y-1">
      <p
        aria-live="polite"
        data-password-rule={met ? "met" : "unmet"}
        className={cn(
          "flex items-center gap-2 text-sm",
          met ? "text-ink" : "text-[var(--muted)]",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            met ? "border-teal-soft bg-teal-soft text-ink" : "border-hairline",
          )}
        >
          {met ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
        {PASSWORD_RULE_COPY}
        <span className="sr-only">{met ? ", done" : ""}</span>
      </p>
      {rejected ? (
        <p role="alert" className="text-sm text-red-300">
          {rejected}
        </p>
      ) : null}
    </div>
  );
}
