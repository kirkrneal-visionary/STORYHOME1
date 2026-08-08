import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerPortalView } from "@/components/seller/SellerPortalView";
import { findSellerListingByCode } from "@/lib/seller-portal";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const listing = findSellerListingByCode(code);
  return {
    title: listing ? `${listing.addressSerif} · Seller Portal` : "Seller Portal",
  };
}

export default async function SellerPortalPage({ params }: PageProps) {
  const { code } = await params;
  const listing = findSellerListingByCode(code);
  if (!listing || listing.status === "sold") notFound();

  return <SellerPortalView listing={listing} />;
}
