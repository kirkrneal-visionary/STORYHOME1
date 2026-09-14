import type { LucideIcon } from "lucide-react";

export function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="story-surface p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--muted)]" />
        <div>
          <h2 className="type-card-title text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
