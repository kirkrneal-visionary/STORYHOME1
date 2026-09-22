import { notFound } from "next/navigation";

/** Internal rewrite target. Always a public miss. */
export const dynamic = "force-dynamic";

export default function StoryPublicMissTrigger() {
  notFound();
}
