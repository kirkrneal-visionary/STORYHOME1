import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-4xl font-bold text-ink">
          Accessibility Statement
        </h1>

        <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--muted)]">
          <p>
            Story Home is committed to ensuring digital accessibility for people
            of all abilities. We are continually working to improve the
            experience for everyone and to apply the relevant accessibility
            standards, aiming to conform to WCAG 2.1 AA where feasible.
          </p>
          <p>
            We welcome your feedback. If you encounter an accessibility barrier,
            or need information provided in a different format, please contact us
            and we will work to provide the information or complete the
            transaction through an alternative method.
          </p>
          <p>
            Accessibility requests:{" "}
            <a href="mailto:privacy@storyhome.com" className="text-gold hover:underline">
              privacy@storyhome.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
