"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Placeholders until Story Home has a sponsoring broker on file. */
const BROKER_NAME = "[Pending]";
const BROKER_LICENSE = "[Pending]";

const SERVICE_COUNTIES =
  "Serving Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, and Walker counties, Texas";

/** Standard Equal Housing Opportunity mark (house with an equal sign). */
function EqualHousingLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-8 w-8 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M6 22 L24 8 L42 22" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M10 21 V40 H38 V21" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="18" y1="30" x2="30" y2="30" strokeLinecap="round" />
      <line x1="18" y1="35" x2="30" y2="35" strokeLinecap="round" />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  // Skip on the full-screen map view and the seller portal's own chrome.
  if (
    pathname === "/marketplace" ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/portal/intelligence")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-hairline bg-[var(--nav-surface)] text-paper/80">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Legal & Compliance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-paper">
              <EqualHousingLogo />
              <span className="font-mono text-[11px] font-bold tracking-wider uppercase">
                Equal Housing
                <br />
                Opportunity
              </span>
            </div>
            <p className="text-xs leading-relaxed text-paper/65">
              Story Home is committed to the letter and spirit of the U.S. policy
              for the achievement of equal housing opportunity throughout the
              nation. We support the Fair Housing Act and do not discriminate
              based on any protected class.{" "}
              <Link href="/fair-housing" className="text-gold hover:underline">
                Fair Housing Guide
              </Link>
              .
            </p>

            <div className="space-y-1.5 border-t border-hairline pt-3 text-xs">
              <p className="font-mono text-[10px] font-bold tracking-wider text-paper/50 uppercase">
                Texas Real Estate Commission
              </p>
              <p>
                <a
                  href="/legal/trec-information-about-brokerage-services.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  Information About Brokerage Services
                </a>{" "}
                <span className="text-paper/45">(blank form — placeholder)</span>
              </p>
              <p>
                <a
                  href="/legal/trec-consumer-protection-notice.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  TREC Consumer Protection Notice
                </a>
              </p>
              <p className="text-paper/65">Brokerage: {BROKER_NAME}</p>
              <p className="text-paper/65">TREC License #: {BROKER_LICENSE}</p>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-hairline pt-3 text-xs">
              <Link href="/privacy" className="hover:text-gold">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gold">Terms of Use</Link>
              <Link href="/accessibility" className="hover:text-gold">Accessibility Statement</Link>
            </div>
          </div>

          {/* Column 2 — Company */}
          <FooterCol title="Company" links={[
            { href: "/about", label: "About Story Home" },
            { href: "/contact", label: "Contact" },
          ]} />

          {/* Column 3 — Buyers & Sellers */}
          <FooterCol title="Buyers & Sellers" links={[
            { href: "/marketplace", label: "Marketplace" },
            { href: "/seller", label: "Sell a Home" },
            { href: "/home", label: "My Home" },
            { href: "/network", label: "Find a Pro" },
          ]} />

          {/* Column 4 — Professionals */}
          <FooterCol title="For Professionals" links={[
            { href: "/portal", label: "Story Pro" },
            { href: "/login", label: "Join as an Agent" },
            { href: "/network", label: "Find agents" },
          ]} />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 space-y-1 border-t border-hairline pt-6 text-center text-xs text-paper/55">
          <p>© 2026 Story Home. All rights reserved.</p>
          <p>{SERVICE_COUNTIES}</p>
          <p className="mx-auto max-w-3xl">
            Story Home is a marketplace platform. All listings are subject to
            verification. Homeowner data in My Home is private and shared only
            with your explicit consent. Not a substitute for legal, tax, or
            financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-mono text-[11px] font-bold tracking-wider text-paper/50 uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-paper/75 hover:text-gold">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
