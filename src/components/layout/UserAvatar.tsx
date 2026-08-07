import Link from "next/link";

type UserAvatarProps = {
  name?: string;
  href?: string;
};

export function UserAvatar({
  name = "Jordan Ellis",
  href = "/profile",
}: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={href}
      className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-hairline bg-[var(--avatar-bg)] text-[var(--avatar-fg)] transition-transform duration-300 hover:scale-[1.04]"
      aria-label={`${name} profile`}
    >
      <span className="font-ui text-xs font-semibold tracking-wide">
        {initials}
      </span>
    </Link>
  );
}
