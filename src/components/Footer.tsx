"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { NavPressButton } from "@/components/nav/NavPressButton";

/** Placeholders until Story Home has a sponsoring broker on file. */
const BROKER_NAME = "[Pending]";
const BROKER_LICENSE = "[Pending]";

const SERVICE_COUNTIES =
  "Serving Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, and Walker counties, Texas";

const EXPLORE_LINKS = [
  { href: "/about", label: "About Story Home" },
  { href: "/contact", label: "Contact" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/seller", label: "Sell a Home" },
  { href: "/home", label: "My Home" },
  { href: "/network", label: "Find a Pro" },
  { href: "/portal", label: "Story Pro" },
  { href: "/login", label: "Join as an Agent" },
] as const;

/** Standard Equal Housing Opportunity mark (house with an equal sign). */
function EqualHousingLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-6 w-6 shrink-0"
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

function FooterExplore({
  legal,
}: {
  legal: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <NavPressButton
          ref={btnRef}
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="true"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-semibold text-paper hover:text-gold"
          onClick={() => setOpen((v) => !v)}
        >
          Explore Story Home
        </NavPressButton>
        {legal}
      </div>
      {open ? (
        <ul
          id={panelId}
          className="story-footer-explore mt-1 max-w-md rounded-[var(--radius-md)] py-1"
        >
          {EXPLORE_LINKS.map((link) => (
            <li key={`${link.href}:${link.label}`}>
              <Link
                href={link.href}
                className="flex min-h-11 items-center px-3 text-sm text-paper/80 hover:text-gold"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
    <footer className="story-site-footer bg-[var(--background)] text-paper/80">
      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="story-wordmark text-[var(--type-brand)] text-paper">
              <span className="text-[var(--brand-word)]">STORY</span>
              <span className="text-[var(--brand-home)]">HOME</span>
            </p>
            <p className="story-wordmark-tagline mt-0.5 text-paper/60">
              Every home has a story.
            </p>
          </div>
          <FooterExplore
            legal={
              <>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-11 items-center px-3 text-sm text-paper/75 hover:text-gold"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex min-h-11 items-center px-3 text-sm text-paper/75 hover:text-gold"
                >
                  Terms of Use
                </Link>
                <Link
                  href="/accessibility"
                  className="inline-flex min-h-11 items-center px-3 text-sm text-paper/75 hover:text-gold"
                >
                  Accessibility Statement
                </Link>
              </>
            }
          />
        </div>

        <Link
          href="/fair-housing"
          className="story-footer-housing mt-6 inline-flex min-h-11 items-center gap-2 text-paper hover:text-gold"
        >
          <EqualHousingLogo />
          <span>Equal Housing Opportunity</span>
        </Link>

        <div className="story-copy mt-5 flex flex-col gap-1">
          <a
            href="/legal/trec-information-about-brokerage-services.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="story-footer-trec text-gold hover:underline"
          >
            TREC Information About Brokerage Services
          </a>
          <p className="text-sm text-paper/45">(blank form — placeholder)</p>
          <a
            href="/legal/trec-consumer-protection-notice.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="story-footer-trec text-gold hover:underline"
          >
            TREC Consumer Protection Notice
          </a>
          <p className="mt-2 text-sm text-paper/65">Brokerage: {BROKER_NAME}</p>
          <p className="text-sm text-paper/65">TREC License #: {BROKER_LICENSE}</p>
        </div>

        <div className="story-copy mt-8 space-y-1 text-xs text-paper/50">
          <p>© 2026 Story Home. All rights reserved.</p>
          <p>{SERVICE_COUNTIES}</p>
          <p className="max-w-3xl">
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
