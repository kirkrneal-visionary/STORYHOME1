import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { LocalPlaceIdentityShell } from "@/components/county/LocalPlaceIdentityShell";
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
    description: `Explore property in ${resolved.identity.displayName}, ${resolved.identity.county.canonicalName}.`,
    robots: NOINDEX,
  };
}

export default async function PublicLocalPlacePage({ params }: PageProps) {
  const { county, place } = await params;
  const resolved = resolvePublicLocalPlace(county, place);
  if (resolved.status === "not_found") notFound();
  if (resolved.status === "redirect") permanentRedirect(resolved.path);
  return <LocalPlaceIdentityShell identity={resolved.identity} />;
}
