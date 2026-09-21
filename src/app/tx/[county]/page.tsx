import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CountyIdentityShell } from "@/components/county/CountyIdentityShell";
import { CountyLocalPlaceDirectory } from "@/components/county/CountyLocalPlaceDirectory";
import { listPublicCountyPlaces } from "@/lib/geo/county-places";
import {
  canonicalCountyParam,
  needsCountyCanonicalRedirect,
  publicCountyPath,
  resolvePublicCounty,
} from "@/lib/geo/county-route";

type PageProps = {
  params: Promise<{ county: string }>;
};

export const dynamic = "force-dynamic";

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { county } = await params;
  const identity = resolvePublicCounty(county);
  if (!identity) {
    return { title: "Not found", robots: NOINDEX };
  }
  return {
    title: `${identity.canonicalName}, Texas`,
    description: `Explore property across ${identity.canonicalName}, Texas.`,
    robots: NOINDEX,
  };
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
  const places = listPublicCountyPlaces(identity);
  return (
    <CountyIdentityShell
      identity={{
        canonicalName: identity.canonicalName,
        state: identity.state,
      }}
    >
      <CountyLocalPlaceDirectory
        countyName={identity.canonicalName}
        countySlug={identity.slug}
        places={places}
      />
    </CountyIdentityShell>
  );
}
