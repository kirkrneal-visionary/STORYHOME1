import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerPortalView } from "@/components/seller/SellerPortalView";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  mapSellerPortal,
  TERMINAL_STATUSES,
  type SellerPortal,
} from "@/lib/seller-portal";

type PageProps = {
  params: Promise<{ code: string }>;
};

async function loadPortal(code: string): Promise<SellerPortal | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("seller_portal_by_code", {
    p_code: code,
  });
  if (error) return null;
  return mapSellerPortal(data);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const portal = await loadPortal(code);
  return {
    title: portal
      ? `${portal.listing.addressSerif} · Seller Portal`
      : "Seller Portal",
  };
}

export default async function SellerPortalPage({ params }: PageProps) {
  const { code } = await params;
  const portal = await loadPortal(code);
  if (!portal || TERMINAL_STATUSES.has(portal.listing.status)) notFound();

  return (
    <SellerPortalView listing={portal.listing} analytics={portal.analytics} />
  );
}
