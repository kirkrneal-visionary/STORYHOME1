"use client";

import { BriefcaseBusiness, Home } from "lucide-react";
import { useRole } from "@/components/providers/RoleProvider";

type RoleSwitcherProps = {
  compact?: boolean;
};

export function RoleSwitcher({ compact = false }: RoleSwitcherProps) {
  const { role, setRole } = useRole();

  return (
    <div
      className="inline-flex items-center rounded-full border border-hairline bg-[var(--surface-elevated)] p-0.5"
      role="group"
      aria-label="Switch active role"
    >
      <button
        type="button"
        onClick={() => setRole("consumer")}
        aria-pressed={role === "consumer"}
        className={[
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300",
          role === "consumer"
            ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
            : "text-[var(--muted)] hover:text-ink",
          compact ? "px-2.5" : "",
        ].join(" ")}
      >
        <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
        {!compact && <span>Buyer</span>}
        <span className="sr-only">Consumer</span>
      </button>
      <button
        type="button"
        onClick={() => setRole("professional")}
        aria-pressed={role === "professional"}
        className={[
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300",
          role === "professional"
            ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
            : "text-[var(--muted)] hover:text-ink",
          compact ? "px-2.5" : "",
        ].join(" ")}
      >
        <BriefcaseBusiness className="h-3.5 w-3.5" strokeWidth={1.75} />
        {!compact && <span>Pro</span>}
        <span className="sr-only">Professional</span>
      </button>
    </div>
  );
}
