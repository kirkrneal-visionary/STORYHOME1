import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentWorldView } from "@/components/agents/AgentWorldView";
import { getServerSupabase } from "@/lib/supabase/server";
import { LISTING_SELECT, rowToAgent, rowToListing } from "@/lib/listings-map";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Prefer photo_url (Settings); fall back to avatar_url for Living Mark still. */
const PROFILE_SELECT =
  "id, full_name, initials, professional_role, primary_market_city, reputation_score, star_rating, review_count, bio, avatar_url, photo_url, living_mark_video_url";

async function loadAgent(id: string) {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const agent = rowToAgent(data);
  const { data: listingRows } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("agent_id", id)
    .order("created_at", { ascending: false });
  return { agent, listings: (listingRows ?? []).map(rowToListing) };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadAgent(id);
  return { title: result?.agent?.fullName ?? "Agent" };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadAgent(id);
  if (!result?.agent) notFound();
  const { agent, listings } = result;

  return <AgentWorldView agent={agent} listings={listings} />;
}
