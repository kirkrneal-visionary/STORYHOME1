export function SettingsLoadingHint({
  label = "Loading settings",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      data-settings-loading="hint"
      className={["type-meta text-[var(--muted)]", className].filter(Boolean).join(" ")}
    >
      {label}
    </p>
  );
}
