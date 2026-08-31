import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SellerPortalView } from "@/components/seller/SellerPortalView";
import { clientIp } from "@/lib/security/rate-limit";
import { lookupSellerPortal } from "@/lib/seller/lookup";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Seller Portal" };
}

export default async function SellerPortalPage({ params }: PageProps) {
  const { code } = await params;
  const hdrs = await headers();
  const result = await lookupSellerPortal({
    code,
    ip: clientIp(hdrs),
    path: "/seller/portal",
  });
  if (!result.ok) notFound();

  return (
    <SellerPortalView
      listing={result.portal.listing}
      analytics={result.portal.analytics}
    />
  );
}
