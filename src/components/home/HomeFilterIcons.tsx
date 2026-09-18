import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  title?: string;
};

function Frame({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HouseIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4.5 10.5 12 4.5l7.5 6V19a1 1 0 0 1-1 1h-4.2v-5.2H9.7V20H5.5a1 1 0 0 1-1-1v-8.5Z" {...stroke} />
    </Frame>
  );
}

export function LandIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 18.5h17" {...stroke} />
      <path d="M8 18.5c.2-3.4 1.6-6.4 4-8.5 2.4 2.1 3.8 5.1 4 8.5" {...stroke} />
      <path d="M12 10V7.5" {...stroke} />
    </Frame>
  );
}

export function CondoIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M6 20V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V20" {...stroke} />
      <path d="M6 20h12" {...stroke} />
      <path d="M9 8h1.4M13.6 8H15M9 11.5h1.4M13.6 11.5H15M9 15h1.4M13.6 15H15" {...stroke} />
    </Frame>
  );
}

export function TownhomeIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 11 8 6.5 12.5 11V20H3.5v-9Z" {...stroke} />
      <path d="M12.5 11 17 6.5 21.5 11V20H12.5" {...stroke} />
      <path d="M7.2 20v-4.2h2.6V20M16.2 20v-4.2h2.6V20" {...stroke} />
    </Frame>
  );
}

export function MobileHomeIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 16.5V10a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 10v6.5" {...stroke} />
      <path d="M4 16.5h16" {...stroke} />
      <path d="M7 8.5V7h3v1.5" {...stroke} />
      <circle cx="8" cy="18.2" r="1.15" {...stroke} />
      <circle cx="16" cy="18.2" r="1.15" {...stroke} />
    </Frame>
  );
}

export function OfficeIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M5 19.5V9.5L12 5l7 4.5v10" {...stroke} />
      <path d="M9.2 19.5v-4.4h5.6v4.4" {...stroke} />
      <path d="M9 11.2h1.3M13.7 11.2H15" {...stroke} />
    </Frame>
  );
}

export function GarageIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4.5 10.5 12 5l7.5 5.5V20h-15v-9.5Z" {...stroke} />
      <path d="M7 20V12.2h10V20" {...stroke} />
      <path d="M7 14.6h10M7 17h10" {...stroke} />
    </Frame>
  );
}

export function PoolIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M5 9.5h14" {...stroke} />
      <path d="M6.5 9.5v3.2c0 1.4.8 2.2 2.2 2.2h6.6c1.4 0 2.2-.8 2.2-2.2V9.5" {...stroke} />
      <path d="M4.5 17.8c1.2-1 2.5-1 3.7 0s2.5 1 3.8 0 2.5-1 3.7 0 2.5 1 3.8 0" {...stroke} />
    </Frame>
  );
}

export function WaterViewIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="8.2" r="2.4" {...stroke} />
      <path d="M4.8 13.2 12 8.8l7.2 4.4" {...stroke} />
      <path d="M4.5 17.6c1.2-1 2.5-1 3.7 0s2.5 1 3.8 0 2.5-1 3.7 0 2.5 1 3.8 0" {...stroke} />
    </Frame>
  );
}

export function WaterfrontIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M7 13.2 12 8.6l5 4.6V16H7v-2.8Z" {...stroke} />
      <path d="M4.5 18.4c1.2-1 2.5-1 3.7 0s2.5 1 3.8 0 2.5-1 3.7 0 2.5 1 3.8 0" {...stroke} />
    </Frame>
  );
}

export function GolfIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M8.5 19.4c2.6-1.8 4.4-1.8 7 0" {...stroke} />
      <path d="M12 18.2V6.4" {...stroke} />
      <path d="M12 6.4 17.2 8.6 12 10.6" {...stroke} />
    </Frame>
  );
}
