"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useSuites } from "@/components/SuitesContext";
import { SuiteAlbumCard } from "@/components/suites/SuiteAlbumCard";

export function SuitesLibrary() {
  const { isLoggedIn } = useAuth();
  const {
    suites,
    drafts,
    status,
    pending,
    importOffer,
    createSuite,
    retry,
    dismissImport,
    importLocalSuites,
  } = useSuites();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [selectedImport, setSelectedImport] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
          Story Home Suite
        </p>
        <h1 className="mt-3 type-page-title text-ink">
          Your property albums live here
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--muted)]">
          Log in as a buyer to build Spotify-style suites — Lake Houses,
          Investment, For Mom — then thumb through and share.
        </p>
        <Link
          href="/login?next=/saved"
          className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Log in to open Suites
        </Link>
      </div>
    );
  }

  async function shareSuite(suiteId: string, suiteName: string) {
    const url = `${window.location.origin}/saved/${suiteId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${suiteName} · Story Home Suite`,
          text: `Browse my Story Home Suite: ${suiteName}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote(`Link copied for “${suiteName}”`);
        setTimeout(() => setShareNote(""), 2500);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setShareNote(`Link copied for “${suiteName}”`);
      setTimeout(() => setShareNote(""), 2500);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-[var(--story-bottom-clearance)] pt-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Story Home Suite
          </p>
          <h1 className="mt-2 type-page-title text-ink">
            Your albums
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Curate homes like playlists — modern album covers, easy thumbing,
            one-tap share.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-navy"
        >
          <Plus className="h-4 w-4" /> New suite
        </button>
      </div>

      {shareNote && (
        <p className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
          {shareNote}
        </p>
      )}

      {status === "failed" && (
        <div className="story-well mt-6 flex flex-wrap items-center justify-between gap-2 px-3 py-3">
          <p className="text-sm text-ink">
            Could not load albums on your account.
            {drafts.length > 0
              ? " Albums on this device stay here until we can reach your account. They are not uploaded."
              : ""}
          </p>
          <button
            type="button"
            onClick={retry}
            className="story-press min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold text-ink"
          >
            Retry
          </button>
        </div>
      )}

      {importOffer && importOffer.length > 0 && (
        <div className="story-surface mt-6 p-4">
          <p className="type-section text-ink">Albums on this device</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            These stay on this phone unless you add them to this account. They
            are not added automatically.
          </p>
          <ul className="mt-3 space-y-2">
            {importOffer.map((suite) => {
              const checked = selectedImport.includes(suite.id);
              return (
                <li key={suite.id}>
                  <label className="flex items-center gap-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedImport((prev) =>
                          checked
                            ? prev.filter((id) => id !== suite.id)
                            : [...prev, suite.id],
                        )
                      }
                    />
                    <span>
                      {suite.name || "Untitled Suite"}
                      <span className="ml-2 font-mono text-[10px] text-[var(--muted)] uppercase">
                        {suite.listingIds.length} homes
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedImport([]);
                dismissImport();
              }}
              className="story-press h-11 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy"
            >
              Don&apos;t add
            </button>
            <button
              type="button"
              disabled={selectedImport.length === 0 || importing || pending}
              onClick={async () => {
                setImporting(true);
                try {
                  await importLocalSuites(selectedImport);
                  setSelectedImport([]);
                } catch (err) {
                  setShareNote(
                    err instanceof Error
                      ? err.message
                      : "Could not add albums to this account.",
                  );
                } finally {
                  setImporting(false);
                }
              }}
              className="story-press h-11 rounded-[var(--radius-md)] border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-40"
            >
              Add selected
            </button>
          </div>
        </div>
      )}

      {creating && (
        <form
          className="story-surface mt-6 flex flex-col gap-3 p-4 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const suite = await createSuite(name);
              setName("");
              setCreating(false);
              window.location.href = `/saved/${suite.id}`;
            } catch (err) {
              setShareNote(
                err instanceof Error ? err.message : "Could not create album.",
              );
            }
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lake Houses, Investment, For Mom"
            className="field-input h-11 flex-1"
          />
          <button
            type="submit"
            disabled={pending}
            className="story-press h-11 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy disabled:opacity-40"
          >
            Create album
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="story-press h-11 rounded-[var(--radius-md)] border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Cancel
          </button>
        </form>
      )}

      {status === "loading" && (
        <p className="mt-10 text-sm text-[var(--muted)]">
          Loading your albums…
        </p>
      )}

      {status === "ready" && suites.length === 0 && !creating && (
        <div className="story-well mt-10 px-6 py-16 text-center">
          <p className="type-section text-ink">No albums yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Create one here, or save a home from the marketplace.
          </p>
        </div>
      )}

      {status !== "loading" && suites.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {suites.map((suite) => (
            <SuiteAlbumCard
              key={suite.id}
              suite={suite}
              onShare={() => shareSuite(suite.id, suite.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
