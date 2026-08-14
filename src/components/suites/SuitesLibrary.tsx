"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useSuites } from "@/components/SuitesContext";
import { SuiteAlbumCard } from "@/components/suites/SuiteAlbumCard";

export function SuitesLibrary() {
  const { isLoggedIn } = useAuth();
  const { suites, createSuite } = useSuites();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [shareNote, setShareNote] = useState("");

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
          Story Home Suite
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-ink">
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
          <h1 className="mt-2 font-serif text-4xl font-bold text-ink">
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

      {creating && (
        <form
          className="story-surface mt-6 flex flex-col gap-3 p-4 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const suite = createSuite(name);
            setName("");
            setCreating(false);
            window.location.href = `/saved/${suite.id}`;
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
            className="story-press h-11 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy"
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

      <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {suites.map((suite) => (
          <SuiteAlbumCard
            key={suite.id}
            suite={suite}
            onShare={() => shareSuite(suite.id, suite.name)}
          />
        ))}
      </div>
    </div>
  );
}
