"use client";

import { scorePassword, type PasswordStrength } from "@/lib/account/password-strength";
import { cn } from "@/lib/utils";

const BAR: Record<Exclude<PasswordStrength, "empty">, string> = {
  weak: "bg-red-400",
  fair: "bg-amber-400",
  good: "bg-teal-soft",
  strong: "bg-teal-soft",
};

export function PasswordStrengthMeter({
  password,
  name,
  email,
}: {
  password: string;
  name?: string;
  email?: string;
}) {
  const result = scorePassword(password, { name, email });
  if (result.level === "empty") return null;
  const fill = BAR[result.level];
  return (
    <div className="space-y-1">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              n <= result.score ? fill : "bg-hairline",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">
        <span className="font-semibold text-ink">{result.label}</span>
        {" — "}
        {result.hint}
      </p>
    </div>
  );
}
