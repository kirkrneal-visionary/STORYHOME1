import { cn } from "@/lib/utils";

/** Thin vertical rule between host links and a network node. */
export function NetworkDivider({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mx-1 hidden h-7 w-px shrink-0 bg-[color-mix(in_srgb,var(--brand-word)_22%,transparent)] md:block",
        className,
      )}
    />
  );
}
