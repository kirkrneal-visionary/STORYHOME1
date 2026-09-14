import { isStoryLabs } from "@/lib/labs/env";

/** Visible only in isolated Story Labs. Never on production. */
export function StoryLabsBanner() {
  if (!isStoryLabs()) return null;
  return (
    <div
      role="status"
      className="type-caption sticky top-0 z-[80] border-b border-amber-400/30 bg-amber-950/90 px-4 py-1.5 text-center font-medium text-amber-100"
    >
      STORY LABS · not production
    </div>
  );
}
