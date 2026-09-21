import Link from "next/link";

export default function CountyNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
      <h1 className="text-xl font-semibold text-ink">This page isn’t available.</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        The link may be wrong, or the page may no longer exist.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
      >
        Back to Story Home
      </Link>
    </main>
  );
}
