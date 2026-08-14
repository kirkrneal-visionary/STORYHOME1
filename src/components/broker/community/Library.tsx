"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  FolderPlus,
  FolderOpen,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  canCurateLibrary,
  COMMUNITY_CATEGORIES,
  searchPosts,
  searchThreads,
  type Member,
  type Thread,
} from "@/lib/community";
import {
  useCommunity,
  addPost,
  createFolder,
  markReviewed,
  removeFromLibrary,
} from "@/components/broker/communityStore";
import {
  formatDate,
  GuardrailComposer,
} from "@/components/broker/community/shared";
import { cn } from "@/lib/utils";

export function CommunityLibrary({ member }: { member: Member }) {
  const state = useCommunity();
  const canCurate = canCurateLibrary(member);

  const [query, setQuery] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderCat, setFolderCat] = useState<string>(COMMUNITY_CATEGORIES[0]);

  const published = useMemo(
    () => state.threads.filter((t) => t.libraryFolderId),
    [state.threads],
  );

  const openThread = openThreadId
    ? state.threads.find((t) => t.id === openThreadId) ?? null
    : null;

  if (openThread) {
    return (
      <LibraryThreadReader
        thread={openThread}
        member={member}
        onBack={() => setOpenThreadId(null)}
      />
    );
  }

  const searching = query.trim().length > 0;
  const searchResults = searchThreads(published, query);

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">
            Knowledge Library
          </h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Broker-curated answers, organized by topic. Search the directory or
            open a folder.
          </p>
        </div>
        {canCurate && (
          <button
            type="button"
            onClick={() => setNewFolder((v) => !v)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-3 text-sm font-semibold text-ink"
          >
            <FolderPlus className="h-4 w-4" /> New folder
          </button>
        )}
      </div>

      {canCurate && newFolder && (
        <div className="mb-4 flex flex-wrap items-end gap-2 story-surface p-3">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="h-9 flex-1 rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink outline-none focus:border-gold"
          />
          <select
            value={folderCat}
            onChange={(e) => setFolderCat(e.target.value)}
            className="h-9 rounded-md border border-hairline bg-[var(--background)] px-2 text-sm text-ink outline-none focus:border-gold"
          >
            {COMMUNITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!folderName.trim()}
            onClick={() => {
              if (!folderName.trim()) return;
              createFolder(folderName.trim(), folderCat);
              setFolderName("");
              setNewFolder(false);
            }}
            className="h-9 rounded-md bg-gold px-4 text-sm font-semibold text-navy disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      <div className="mb-5 flex items-center gap-2 rounded-md border border-hairline bg-[var(--background)] px-3">
        <Search className="h-4 w-4 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the whole library (title, topic, tags)…"
          className="h-10 w-full bg-transparent text-sm text-ink outline-none"
        />
      </div>

      {searching ? (
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
            {searchResults.length} result(s) for “{query}”
          </p>
          {searchResults.map((t) => (
            <ThreadRow key={t.id} thread={t} onOpen={() => setOpenThreadId(t.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {state.libraryFolders.map((folder) => {
            const items = published.filter(
              (t) => t.libraryFolderId === folder.id,
            );
            return (
              <section key={folder.id}>
                <h4 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
                  <FolderOpen className="h-4 w-4" /> {folder.name} · {items.length}
                </h4>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-hairline p-4 text-xs text-[var(--muted)]">
                    Nothing filed here yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((t) => (
                      <ThreadRow
                        key={t.id}
                        thread={t}
                        onOpen={() => setOpenThreadId(t.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThreadRow({
  thread,
  onOpen,
}: {
  thread: Thread;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 story-surface p-4 text-left hover:border-gold/40"
    >
      <div className="min-w-0">
        <span className="block truncate font-semibold text-ink">
          {thread.title}
        </span>
        <span className="font-mono text-[11px] text-[var(--muted)]">
          {thread.category}
          {thread.tags.length > 0 && ` · ${thread.tags.join(", ")}`}
        </span>
      </div>
      {thread.reviewedAsOf && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-teal-soft/15 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-soft uppercase">
          <ShieldCheck className="h-3 w-3" /> {formatDate(thread.reviewedAsOf)}
        </span>
      )}
    </button>
  );
}

function LibraryThreadReader({
  thread,
  member,
  onBack,
}: {
  thread: Thread;
  member: Member;
  onBack: () => void;
}) {
  const state = useCommunity();
  const [query, setQuery] = useState("");
  const [asUpdate, setAsUpdate] = useState(false);
  const canCurate = canCurateLibrary(member);

  const posts = useMemo(() => {
    const list = state.posts
      .filter((p) => p.threadId === thread.id)
      .sort((a, b) => a.createdAt - b.createdAt);
    return searchPosts(list, query);
  }, [state.posts, thread.id, query]);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-2xl font-bold text-ink">
            {thread.title}
          </h3>
          <p className="mt-1 font-mono text-[11px] text-[var(--muted)] uppercase">
            {thread.category}
            {thread.tags.length > 0 && ` · ${thread.tags.join(", ")}`}
          </p>
          {thread.reviewedAsOf && (
            <p className="mt-1 inline-flex items-center gap-1 rounded bg-teal-soft/15 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-soft uppercase">
              <ShieldCheck className="h-3 w-3" /> Reviewed current as of{" "}
              {formatDate(thread.reviewedAsOf)}
              {thread.reviewedBy ? ` · ${thread.reviewedBy}` : ""}
            </p>
          )}
        </div>
        {canCurate && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => markReviewed(thread.id, member.name)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Mark reviewed
            </button>
            <button
              type="button"
              onClick={() => {
                removeFromLibrary(thread.id);
                onBack();
              }}
              className="rounded-md border border-hairline px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-red-300"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-hairline bg-[var(--background)] px-3">
        <Search className="h-4 w-4 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search within this thread…"
          className="h-9 w-full bg-transparent text-sm text-ink outline-none"
        />
      </div>

      <ul className="mt-4 space-y-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className={cn(
              "rounded-xl border p-4",
              p.kind === "update"
                ? "border-gold/50 bg-gold/10"
                : "story-surface",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{p.authorName}</span>
              <span className="font-mono text-[10px] text-[var(--muted)]">
                {p.kind === "update" && (
                  <span className="mr-2 rounded bg-gold px-1.5 py-0.5 font-bold text-navy uppercase">
                    Law update
                  </span>
                )}
                {formatDate(p.createdAt)}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{p.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 story-surface p-4">
        <p className="mb-2 text-xs text-[var(--muted)]">
          Keep this living document current — add a note or a law update if
          something changed.
        </p>
        <GuardrailComposer
          placeholder={
            asUpdate ? "Post a law/notes update…" : "Add a note or comment…"
          }
          submitLabel={asUpdate ? "Post update" : "Add note"}
          onSubmit={(body) => {
            addPost({
              threadId: thread.id,
              authorId: member.id,
              authorName: member.name,
              body,
              kind: asUpdate ? "update" : "post",
            });
            setAsUpdate(false);
          }}
          extraControls={
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={asUpdate}
                onChange={(e) => setAsUpdate(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Mark as law/notes update
            </label>
          }
        />
      </div>
    </div>
  );
}
