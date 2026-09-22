import Link from "next/link";
import {
  initialsFromDisplayName,
  type UsernamePublicStub as Stub,
} from "@/lib/account/username-public";

export function UsernamePublicStub({ stub }: { stub: Stub }) {
  const initials = initialsFromDisplayName(stub.displayName);
  const kindLabel = stub.kind === "professional" ? "Professional" : "Consumer";

  return (
    <main
      data-ui-3a="username-public"
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        className="relative h-20 overflow-hidden [@media(max-height:499px)]:h-12 md:h-24"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(18,63,56,0.36),transparent_46%),radial-gradient(ellipse_at_80%_0%,rgba(245,183,30,0.12),transparent_42%),linear-gradient(180deg,transparent_10%,var(--background)_100%)]" />
      </div>
      <div className="relative z-[1] mx-auto max-w-xl px-4 md:px-8">
        {stub.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stub.photoUrl}
            alt=""
            className="-mt-8 h-20 w-20 rounded-full object-cover ring-2 ring-gold/40 ring-offset-2 ring-offset-[var(--background)]"
          />
        ) : (
          <div className="-mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-lg font-bold text-navy ring-2 ring-gold/40 ring-offset-2 ring-offset-[var(--background)]">
            {initials}
          </div>
        )}
        <h1 className="mt-5 type-page-title tracking-[-0.02em] text-ink">
          {stub.displayName}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">@{stub.username}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{kindLabel}</p>
        {stub.agentWorldHref ? (
          <Link
            href={stub.agentWorldHref}
            className="story-press story-cta-primary mt-7"
          >
            View professional profile
          </Link>
        ) : null}
        <p className="mt-10 border-t border-hairline pt-6 pb-2">
          <Link
            href="/"
            className="story-press inline-flex min-h-11 items-center text-sm font-medium text-[var(--muted)] hover:text-gold"
          >
            Story Home
          </Link>
        </p>
      </div>
    </main>
  );
}
