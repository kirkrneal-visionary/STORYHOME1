import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use (Draft)" };

export default function TermsPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm text-ink">
          <strong>DRAFT — pending legal review.</strong> This outline describes the
          intended terms for using Story Home. It is not yet a finalized legal
          agreement and should be reviewed by an attorney before launch.
          Effective date: [pending].
        </div>

        <h1 className="mt-8 font-serif text-4xl font-bold text-ink">Terms of Use</h1>

        <div className="mt-6 space-y-6 text-base leading-relaxed text-[var(--muted)]">
          <Section title="Acceptance">
            <p>By using Story Home, you agree to these terms once finalized.</p>
          </Section>

          <Section title="Accounts">
            <p>
              You are responsible for the accuracy of your account information and
              for maintaining the security of your login. Professional accounts
              must provide accurate license and brokerage information.
            </p>
          </Section>

          <Section title="Listings & verification">
            <p>
              Listings are created by real estate professionals and are subject to
              verification. Story Home applies automated compliance safeguards
              (including Fair Housing and Texas disclosure checks) but does not
              guarantee the accuracy of any listing; the responsible broker and
              agent remain accountable for their content.
            </p>
          </Section>

          <Section title="Homeowner data ownership">
            <p>
              Content you add to My Home belongs to you. It remains private unless
              you grant access to a specific professional, and you may revoke that
              access, export your data, or delete a home at any time.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>
              Do not post unlawful, discriminatory, or infringing content, attempt
              to access data you are not authorized to see, or misuse the platform.
            </p>
          </Section>

          <Section title="No professional advice">
            <p>
              Story Home is a marketplace platform. Nothing on it is legal, tax,
              or financial advice, and the informational property disclosure is
              not a substitute for the official signed forms required at sale.
            </p>
          </Section>

          <Section title="Disclaimers & changes">
            <p>
              The service is provided &ldquo;as is.&rdquo; Specific warranty and
              liability terms will be finalized here with legal review. We may
              update these terms and will post the effective date when we do.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions:{" "}
              <a href="mailto:hello@storyhome.com" className="text-gold hover:underline">
                hello@storyhome.com
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
