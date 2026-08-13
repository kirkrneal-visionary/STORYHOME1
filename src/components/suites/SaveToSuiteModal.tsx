"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useSuites } from "@/components/SuitesContext";
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
  const { suites, createSuite, addListingToSuite, removeListingFromSuite } =
    useSuites();
  const [newName, setNewName] = useState("");

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
          <h3 className="font-serif text-2xl font-bold">Save to a Suite</h3>
          <p className="mt-2 text-sm text-paper/70">
            Log in as a buyer to add homes to album-style collections.
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
            <h3 className="font-serif text-2xl font-bold">Add to Suite</h3>
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

        <div className="story-well mt-5 max-h-64 space-y-2 overflow-y-auto p-2">
          {suites.map((suite) => {
            const inSuite = suite.listingIds.includes(listingId);
            return (
              <button
                key={suite.id}
                type="button"
                onClick={() => {
                  if (inSuite) removeListingFromSuite(suite.id, listingId);
                  else addListingToSuite(suite.id, listingId);
                }}
                className={cn(
                  "story-press flex w-full items-center justify-between rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors",
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
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            const suite = createSuite(newName.trim());
            addListingToSuite(suite.id, listingId);
            setNewName("");
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
            className="story-press h-11 rounded-[var(--radius-md)] bg-gold px-4 text-sm font-bold text-navy"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
