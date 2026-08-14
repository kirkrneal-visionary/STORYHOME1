import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="story-room-pad min-h-dvh px-4 pb-[var(--story-bottom-clearance)] md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl font-bold text-ink">Contact</h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
          We&rsquo;d love to hear from you — whether you&rsquo;re a homeowner, a
          buyer, or an East Texas real estate professional.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-hairline bg-[var(--surface)] p-5">
            <p className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
              General
            </p>
            <a
              href="mailto:hello@storyhome.com"
              className="mt-1 block text-lg font-semibold text-gold hover:underline"
            >
              hello@storyhome.com
            </a>
          </div>
          <div className="rounded-xl border border-hairline bg-[var(--surface)] p-5">
            <p className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
              Accessibility & privacy requests
            </p>
            <a
              href="mailto:privacy@storyhome.com"
              className="mt-1 block text-lg font-semibold text-gold hover:underline"
            >
              privacy@storyhome.com
            </a>
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] text-[var(--muted)]">
          Serving Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, and
          Walker counties, Texas.
        </p>
      </div>
    </div>
  );
}
