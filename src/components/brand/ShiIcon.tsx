import { cn } from "@/lib/utils";

type ShiIconProps = {
  className?: string;
  /** Optional pixel size (matches Lucide `size` prop shape for menu reuse). */
  size?: number;
  title?: string;
};

/**
 * Story Home Intelligence mark — brandable, distinct from Lucide nav icons.
 * Geometry: three orbit nodes around a core (search → research → convert).
 */
export function ShiIcon({
  className,
  size,
  title = "Story Home Intelligence",
}: ShiIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={cn("h-4 w-4", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* Outer ring */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.35"
      />
      {/* Core diamond */}
      <path
        d="M12 6.5L16.5 12L12 17.5L7.5 12L12 6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Inner pulse */}
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      {/* Orbit nodes */}
      <circle cx="12" cy="4.2" r="1.15" fill="currentColor" />
      <circle cx="19.2" cy="15.5" r="1.15" fill="currentColor" />
      <circle cx="4.8" cy="15.5" r="1.15" fill="currentColor" />
    </svg>
  );
}
