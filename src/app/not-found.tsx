import { PublicMiss } from "@/components/story/PublicMiss";

export default function NotFound() {
  return (
    <PublicMiss
      title="This page isn’t available."
      body="The link may be wrong, or the page may no longer exist."
    />
  );
}
