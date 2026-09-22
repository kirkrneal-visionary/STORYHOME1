import { PublicMiss } from "@/components/story/PublicMiss";

/** Internal rewrite target. Middleware keeps HTTP 404. */
export const dynamic = "force-dynamic";

export default function StoryPublicMissTrigger() {
  return (
    <PublicMiss
      title="This page isn’t available."
      body="The link may be wrong, or the page may no longer exist."
    />
  );
}
