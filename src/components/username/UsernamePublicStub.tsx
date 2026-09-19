import Link from "next/link";
import {
  initialsFromDisplayName,
  type UsernamePublicStub as Stub,
} from "@/lib/account/username-public";

export function UsernamePublicStub({ stub }: { stub: Stub }) {
  const initials = initialsFromDisplayName(stub.displayName);
  const kindLabel = stub.kind === "professional" ? "Professional" : "Consumer";

  return (
    <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <p className="font-mono text-[11px] tracking-[0.16em] text-gold uppercase">
        Story Home
      </p>
      <section className="story-surface mt-4 p-6 text-center">
        {stub.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stub.photoUrl}
            alt=""
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-lg font-bold text-navy">
            {initials}
          </div>
        )}
        <h1 className="mt-4 type-page-title text-ink">@{stub.username}</h1>
        <p className="mt-2 text-base font-semibold text-ink">{stub.displayName}</p>
        <p className="mt-1 font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
          {kindLabel}
        </p>
        {stub.agentWorldHref ? (
          <Link
            href={stub.agentWorldHref}
            className="story-press mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
          >
            View professional profile
          </Link>
        ) : null}
      </section>
    </div>
  );
}
