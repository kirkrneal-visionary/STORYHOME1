import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  canonicalCountyParam,
  needsCountyCanonicalRedirect,
  publicCountyPath,
  resolvePublicCounty,
} from "@/lib/geo/county-route";

type PageProps = {
  params: Promise<{ county: string }>;
};

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { county } = await params;
  const identity = resolvePublicCounty(county);
  if (!identity) {
    return { title: "Not found", robots: NOINDEX };
  }
  return { title: identity.canonicalName, robots: NOINDEX };
}

export default async function PublicCountyPage({ params }: PageProps) {
  const { county } = await params;
  const canonical = canonicalCountyParam(county);
  if (!canonical) notFound();
  if (needsCountyCanonicalRedirect(county, canonical)) {
    permanentRedirect(publicCountyPath(canonical));
  }
  const identity = resolvePublicCounty(canonical);
  if (!identity) notFound();
  return (
    <main className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] md:px-6">
      <h1 className="text-xl font-semibold text-ink">{identity.canonicalName}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Texas · {identity.countyFips}
      </p>
    </main>
  );
}
