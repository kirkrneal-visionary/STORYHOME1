import type { ReactNode } from "react";

type StoryEmptyWellProps = {
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
};

/** Honest empty content on a valid page. Not a 404. */
export function StoryEmptyWell({
  title,
  body,
  children,
  className = "story-well px-5 py-12 text-center",
}: StoryEmptyWellProps) {
  return (
    <div data-story-empty="" className={className}>
      <p className="type-card-title text-ink">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
      {children}
    </div>
  );
}
