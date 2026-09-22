import Link from "next/link";

type PublicMissProps = {
  title: string;
  body: string;
};

/** Public 404 presentation. Does not encode why a route missed. */
export function PublicMiss({ title, body }: PublicMissProps) {
  return (
    <main
      data-story-public-miss=""
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        className="relative hidden h-12 max-h-[12vh] overflow-hidden [@media(min-height:500px)]:block md:h-16"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(245,183,30,0.12),transparent_46%),linear-gradient(180deg,transparent_10%,var(--background)_100%)]" />
      </div>
      <div className="relative z-[1] mx-auto max-w-xl px-4 md:px-8">
        <h1 className="type-page-title text-balance tracking-[-0.02em] text-ink">
          {title}
        </h1>
        <p className="mt-3 type-ui text-[var(--muted)]">{body}</p>
        <Link
          href="/"
          className="story-press story-cta-primary mt-7"
        >
          Back to Story Home
        </Link>
      </div>
    </main>
  );
}
