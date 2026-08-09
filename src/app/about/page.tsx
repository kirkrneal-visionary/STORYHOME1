import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl font-bold text-ink">About Story Home</h1>
        <p className="mt-2 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
          Every home has a story.
        </p>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--muted)]">
          <p>
            Story Home is a premium, two‑sided real estate marketplace and
            professional network — built by a realtor, for realtors — with a
            focus on East Texas.
          </p>
          <p>
            We&rsquo;re starting where the big national portals give the least
            attention: the communities across Polk, Trinity, Angelina, Tyler,
            San Jacinto, Liberty, and Walker counties. Our goal is a platform
            that treats local agents as partners, gives consumers real ownership
            of their home data, and keeps the whole experience honest and
            transparent.
          </p>
          <p>
            For buyers and sellers, that means a clean marketplace and a private
            &ldquo;My Home&rdquo; vault where you control your renovation history,
            expenses, and documents — and decide exactly which professional, if
            any, ever sees them. For agents and brokers, it means real tools,
            direct listings, a fair lead system, and a community built to help
            each other close.
          </p>
        </div>
      </div>
    </div>
  );
}
