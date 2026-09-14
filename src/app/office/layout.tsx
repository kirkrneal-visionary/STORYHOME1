import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { officePageAccess, officeRefuseCopy } from "@/lib/account/office-gate";
import { promoteSignedInPro } from "@/lib/account/promote-pro";
import { getAccountReadiness } from "@/lib/account/require-account-ready";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Office tools are for the managing-broker login only.
 * Demo mode (no Supabase) renders the page so local walkthroughs work.
 */
export default async function OfficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return <>{children}</>;
  }

  const result = await promoteSignedInPro();
  const access = officePageAccess({
    signedIn: result.ok,
    purpose: result.ok ? result.accountPurpose : null,
  });
  if (access === "login") {
    redirect("/login?next=/office");
  }
  if (access === "allow") {
    const ready = await getAccountReadiness({
      purpose: result.ok ? result.accountPurpose : null,
      kind: result.ok ? result.accountKind : null,
      nextPath: "/office",
    });
    if (!ready.ok && ready.redirectTo) {
      redirect(ready.redirectTo);
    }
  }
  if (access === "refuse") {
    const copy = officeRefuseCopy(result.ok ? result.accountPurpose : null);
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
