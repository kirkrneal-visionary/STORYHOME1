import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { canUseFounderQa, resolveLabsRole } from "@/lib/labs/authz";
import { founderQaEnabled } from "@/lib/labs/env";
import { FounderQaConsole } from "@/components/labs/FounderQaConsole";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Founder QA",
  robots: { index: false, follow: false, nocache: true },
};

export default async function FounderQaPage() {
  if (!founderQaEnabled()) notFound();

  const supabase = await getServerSupabase();
  if (!supabase) redirect("/login?next=/internal/qa");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/internal/qa");

  const role = resolveLabsRole(user.email);
  if (!role || !canUseFounderQa(role)) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="font-serif text-2xl text-[var(--ink-1)]">Story Labs</p>
        <p className="mt-3 text-sm text-[var(--ink-3)]">
          This account is not on the Founder QA list. Ask the founder to add your
          email on the staging project.
        </p>
      </main>
    );
  }

  return <FounderQaConsole role={role} email={user.email ?? ""} />;
}
