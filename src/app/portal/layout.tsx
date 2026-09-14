import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { portalPageAccess, portalRefuseCopy } from "@/lib/account/portal-gate";
import { promoteSignedInPro } from "@/lib/account/promote-pro";

export const dynamic = "force-dynamic";

/**
 * Story Pro pages refuse regular users and office-admin sessions on the server.
 * Browser-only chrome is not the gate.
 */
export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const result = await promoteSignedInPro();
  const access = portalPageAccess(result);
  if (access === "login") {
    redirect("/login?next=/portal");
  }
  if (access === "refuse") {
    const copy = portalRefuseCopy(result.ok ? result.accountPurpose : null);
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] text-center">
        <h1 className="type-page-title text-ink">{copy.title}</h1>
        <p className="type-ui mt-3 text-[var(--muted)]">{copy.body}</p>
        <Link
          href={copy.href}
          className="story-press mt-6 inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-navy px-5 text-sm font-bold text-gold"
        >
          {copy.cta}
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
