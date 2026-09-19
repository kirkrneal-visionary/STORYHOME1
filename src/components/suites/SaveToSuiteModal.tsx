"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useSuites } from "@/components/SuitesContext";
import { track } from "@/lib/analytics";
import { reportListingActivity } from "@/lib/listing-activity";
import { cn } from "@/lib/utils";
import Link from "next/link";

type SaveToSuiteModalProps = {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
};

export function SaveToSuiteModal({
  listingId,
  listingTitle,
  onClose,
}: SaveToSuiteModalProps) {
  const { isLoggedIn } = useAuth();
  const {
    suites,
    status,
    pending,
    createSuite,
    addListingToSuite,
    removeListingFromSuite,
    retry,
  } = useSuites();
  const [newName, setNewName] = useState("");
  const [note, setNote] = useState("");

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[1200] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close"
          className="story-scrim absolute inset-0"
          onClick={onClose}
        />
        <div className="story-sheet relative z-[1] p-5 sm:p-6">
          <div className="story-sheet-handle" />
          <h3 className="type-section">Save to a Suite</h3>
          <p className="mt-2 text-sm text-paper/70">
            Log in as a Consumer to add homes to album-style collections.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="story-press h-11 flex-1 rounded-[var(--radius-md)] border border-hairline text-sm font-semibold"
            >
              Cancel
            </button>
            <Link
              href={`/login?next=/marketplace`}
              className="story-press flex h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-gold text-sm font-bold text-navy"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="story-scrim absolute inset-0"
        onClick={onClose}
      />
      <div className="story-sheet relative z-[1] p-5">
        <div className="story-sheet-handle" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="type-section">Add to Suite</h3>
            <p className="mt-1 text-sm text-paper/65">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="story-press flex h-9 w-9 items-center justify-center rounded-full border border-hairline"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "failed" && (
          <div className="story-well mt-4 flex items-center justify-between gap-2 px-3 py-2">
            <p className="text-sm text-paper/80">Could not load your albums.</p>
            <button
              type="button"
              onClick={retry}
              className="story-press min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {note && <p className="mt-3 text-sm text-gold">{note}</p>}

        <div className="story-well mt-5 max-h-64 space-y-2 overflow-y-auto p-2">
          {status === "loading" && (
            <p className="px-2 py-3 text-sm text-paper/60">Loading albums…</p>
          )}
          {status !== "loading" &&
            suites.map((suite) => {
              const inSuite = suite.listingIds.includes(listingId);
              return (
                <button
                  key={suite.id}
                  type="button"
                  disabled={pending}
                  onClick={async () => {
                    try {
                      if (inSuite) {
                        await removeListingFromSuite(suite.id, listingId);
                      } else {
                        await addListingToSuite(suite.id, listingId);
                        track("listing_saved", {
                          listing_id: listingId,
                          source_surface: "marketplace",
                        });
                        reportListingActivity(listingId, "save");
                      }
                    } catch (err) {
                      setNote(
                        err instanceof Error
                          ? err.message
                          : "Could not update this album.",
                      );
                    }
                  }}
                  className={cn(
                    "story-press flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors disabled:opacity-40",
                    inSuite
                      ? "border-gold bg-gold/10"
                      : "border-hairline bg-[color-mix(in_srgb,var(--background)_40%,transparent)] hover:border-[var(--hairline-interactive)]",
                  )}
                >
                  <div>
                    <p className="font-semibold">{suite.name}</p>
                    <p className="font-mono text-[10px] text-paper/50 uppercase">
                      {suite.listingIds.length} homes
                    </p>
                  </div>
                  {inSuite ? (
                    <Check className="h-4 w-4 text-gold" />
                  ) : (
                    <Plus className="h-4 w-4 text-paper/50" />
                  )}
                </button>
              );
            })}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            try {
              const suite = await createSuite(newName.trim());
              await addListingToSuite(suite.id, listingId);
              track("listing_saved", {
                listing_id: listingId,
                source_surface: "marketplace",
              });
              reportListingActivity(listingId, "save");
              setNewName("");
            } catch (err) {
              setNote(
                err instanceof Error ? err.message : "Could not create album.",
              );
            }
          }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New suite name"
            className="field-input h-11 flex-1"
          />
          <button
            type="submit"
            disabled={pending}
            className="story-press h-11 rounded-[var(--radius-md)] bg-gold px-4 text-sm font-bold text-navy disabled:opacity-40"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
