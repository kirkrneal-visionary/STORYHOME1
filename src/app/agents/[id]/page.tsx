import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentWorldView } from "@/components/agents/AgentWorldView";
import { DEMO_AGENT, type DemoAgent } from "@/lib/demo-data";
import { getServerSupabase } from "@/lib/supabase/server";
import { LISTING_SELECT, rowToAgent, rowToListing } from "@/lib/listings-map";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Prefer photo_url (Settings); fall back to avatar_url for Living Mark still. */
const PROFILE_SELECT =
  "id, full_name, initials, professional_role, primary_market_city, reputation_score, star_rating, review_count, bio, avatar_url, photo_url, living_mark_video_url";

/** Demo / preview fallback when Supabase is not configured (local Story Walk track). */
function demoAgentForId(id: string): DemoAgent {
  const known: Record<string, Partial<DemoAgent>> = {
    "user-realtor": {
      fullName: "Sarah Jenkins",
      initials: "SJ",
      professionalRole: "realtor_broker",
    },
    "user-broker": {
      fullName: "Dana Brooks",
      initials: "DB",
      professionalRole: "broker",
    },
    "user-pro-realtor_broker": {
      fullName: "Sarah Jenkins",
      initials: "SJ",
      professionalRole: "realtor_broker",
    },
  };
  const patch = known[id] ?? {};
  const isPro =
    Boolean(known[id]) ||
    id.startsWith("user-pro") ||
    id.startsWith("user-broker");
  return {
    ...DEMO_AGENT,
    id,
    fullName: patch.fullName ?? (isPro ? "Sarah Jenkins" : "Story Home Agent"),
    initials: patch.initials ?? (isPro ? "SJ" : "SH"),
    professionalRole: patch.professionalRole ?? "agent",
    primaryMarketCity: "East Texas",
    bio: "Demo Agent World — Living Mark library + presence on the preview track.",
    photoUrl: null,
    livingMarkVideoUrl: null,
  };
}

async function loadAgent(id: string) {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { agent: demoAgentForId(id), listings: [] };
  }
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const agent = rowToAgent(data);
  if (!agent) return null;
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
