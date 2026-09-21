import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolvePublicLocalPlace } from "@/lib/geo/local-place-route";

type PageProps = {
  params: Promise<{ county: string; place: string }>;
};

export const dynamic = "force-dynamic";

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { county, place } = await params;
  const resolved = resolvePublicLocalPlace(county, place);
  if (resolved.status !== "ok") {
    return { title: "Not found", robots: NOINDEX };
  }
  return {
    title: `${resolved.identity.displayName}, Texas`,
    robots: NOINDEX,
  };
}

export default async function PublicLocalPlacePage({ params }: PageProps) {
  const { county, place } = await params;
  const resolved = resolvePublicLocalPlace(county, place);
  if (resolved.status === "not_found") notFound();
  if (resolved.status === "redirect") permanentRedirect(resolved.path);
  const { identity } = resolved;
  return (
    <main
      data-local-place-route=""
      className="min-h-dvh px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] md:px-8"
    >
      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
        {identity.displayName}
      </h1>
      <p className="mt-2 text-base text-[var(--muted)]">
        {identity.county.canonicalName}
      </p>
    </main>
  );
}
