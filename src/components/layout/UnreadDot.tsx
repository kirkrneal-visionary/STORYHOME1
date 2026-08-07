type UnreadDotProps = {
  visible?: boolean;
  className?: string;
};

/** Subtle gold unread indicator — never a loud red badge */
export function UnreadDot({ visible = false, className = "" }: UnreadDotProps) {
  if (!visible) return null;

  return (
    <span
      className={[
        "absolute right-0 top-0 h-2 w-2 rounded-full bg-gold shadow-[0_0_0_2px_var(--nav-surface)]",
        className,
      ].join(" ")}
      aria-label="Unread messages"
    />
  );
}
