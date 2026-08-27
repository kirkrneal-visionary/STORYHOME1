"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { SaveToSuiteModal } from "@/components/suites/SaveToSuiteModal";

export function ListingSaveButton({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="story-press flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-hairline text-sm font-semibold text-ink"
      >
        <Bookmark className="h-4 w-4" />
        Save to Suite
      </button>
      {open ? (
        <SaveToSuiteModal
          listingId={listingId}
          listingTitle={listingTitle}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
