import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fair Housing" };

export default function FairHousingPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl font-bold text-ink">
          Fair Housing Commitment
        </h1>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--muted)]">
          <p>
            Story Home is committed to the letter and spirit of the U.S. policy
            for the achievement of equal housing opportunity throughout the
            nation. We comply with the federal Fair Housing Act and the Texas
            fair housing laws.
          </p>

          <div className="rounded-xl border border-hairline bg-[var(--surface)] p-5">
            <h2 className="font-serif text-xl font-bold text-ink">
              Protected classes
            </h2>
            <p className="mt-2">
              It is illegal to discriminate in the sale, rental, financing, or
              advertising of housing based on:
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {[
                "Race",
                "Color",
                "National origin",
                "Religion",
                "Sex (including gender identity & sexual orientation)",
                "Familial status",
                "Disability",
              ].map((c) => (
                <li key={c} className="text-sm text-ink">• {c}</li>
              ))}
            </ul>
          </div>

          <h2 className="font-serif text-xl font-bold text-ink">
            How we enforce it on Story Home
          </h2>
          <p>
            Every listing published through Story Pro is automatically screened
            for language that expresses a discriminatory preference or engages in
            steering. Listings that contain prohibited language cannot be
            published until they are corrected. This is an automated safeguard in
            addition to — not a replacement for — each brokerage&rsquo;s own
            review obligations.
          </p>

          <h2 className="font-serif text-xl font-bold text-ink">Report a concern</h2>
          <p>
            If you believe you have experienced housing discrimination, you may
            file a complaint with the U.S. Department of Housing and Urban
            Development (HUD) at{" "}
            <a
              href="https://www.hud.gov/fairhousing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              hud.gov/fairhousing
            </a>
            , or contact us at{" "}
            <a href="mailto:privacy@storyhome.com" className="text-gold hover:underline">
              privacy@storyhome.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
