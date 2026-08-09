import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy (Draft)" };

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm text-ink">
          <strong>DRAFT — pending legal review.</strong> This outline describes how
          Story Home intends to handle data. It is not yet a finalized legal
          agreement and should be reviewed by an attorney before launch.
          Effective date: [pending].
        </div>

        <h1 className="mt-8 font-serif text-4xl font-bold text-ink">Privacy Policy</h1>

        <div className="mt-6 space-y-6 text-base leading-relaxed text-[var(--muted)]">
          <Section title="Information we collect">
            <ul className="ml-5 list-disc space-y-1">
              <li>Account information (name, email, account type) via our authentication provider.</li>
              <li>Professional details you provide (brokerage, license number, market area, bio).</li>
              <li>Listing information created by agents.</li>
              <li>
                &ldquo;My Home&rdquo; content you choose to add: property details,
                renovation and maintenance history, expenses, uploaded documents
                and receipts, and an informational property disclosure.
              </li>
              <li>Basic usage/technical data needed to operate the service.</li>
            </ul>
          </Section>

          <Section title="Your My Home data is private by default">
            <p>
              Content you add to My Home is visible only to you unless you
              explicitly grant access to a specific real estate professional. You
              control the scope of each grant (full file, or an improvement
              report only), you can revoke access at any time, and an access log
              records who was granted or revoked and when. Uploaded files are
              stored in private storage and served through short‑lived, access‑
              controlled links.
            </p>
          </Section>

          <Section title="How we use information">
            <p>
              To operate and improve the marketplace and My Home features, to
              provide the professional tools, to enforce compliance safeguards,
              and to communicate with you about your account. We do not sell your
              personal My Home data.
            </p>
          </Section>

          <Section title="Your rights: export and deletion">
            <p>
              You own your data. You can export your My Home data at any time and
              delete a home (and its associated records, expenses, documents, and
              grants). Additional rights may apply under applicable law.
            </p>
          </Section>

          <Section title="Security">
            <p>
              Access is enforced at the database level (row‑level security), files
              are kept in private storage, and data is encrypted in transit and at
              rest by our infrastructure provider. No system is perfectly secure;
              specific safeguards and any formal certifications will be described
              here once finalized.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Privacy questions or requests:{" "}
              <a href="mailto:privacy@storyhome.com" className="text-gold hover:underline">
                privacy@storyhome.com
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-bold text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
