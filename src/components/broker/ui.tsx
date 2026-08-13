"use client";

import { cn } from "@/lib/utils";

/** USD formatter. Pass `cents` for two-decimal monetary values. */
export function usd(value: number, cents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function pct(value: number, decimals = 2): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${v.toFixed(decimals)}%`;
}

/** Parse a possibly-empty numeric input string into a finite number. */
export function toNumber(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min = 0,
  hint,
  id,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: number;
  hint?: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </span>
      <span className="mt-1.5 flex items-center rounded-[var(--radius-md)] border border-hairline bg-[color-mix(in_srgb,var(--navy-deep)_70%,var(--background))] shadow-[var(--elev-deboss)] focus-within:border-gold focus-within:shadow-[var(--elev-deboss),var(--ring-focus)]">
        {prefix && (
          <span className="pl-3 text-sm text-[var(--muted)]">{prefix}</span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full bg-transparent px-3 text-sm text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="pr-3 text-sm text-[var(--muted)]">{suffix}</span>
        )}
      </span>
      {hint && (
        <span className="mt-1 block text-[11px] text-[var(--muted)]">{hint}</span>
      )}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  id,
  hint,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink outline-none focus:border-gold"
      />
      {hint && (
        <span className="mt-1 block text-[11px] text-[var(--muted)]">{hint}</span>
      )}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  id,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id: string;
  rows?: number;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </span>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-hairline bg-[var(--background)] px-3 py-2 text-sm text-ink outline-none focus:border-gold"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
  id: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink outline-none focus:border-gold"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-hairline bg-[var(--background)] p-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}

export function ResultRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2",
        strong && "border-t border-hairline pt-3",
      )}
    >
      <span
        className={cn(
          "text-sm",
          strong ? "font-semibold text-ink" : "text-[var(--muted)]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          accent ? "font-bold text-gold" : strong ? "font-bold text-ink" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
