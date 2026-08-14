"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Hash,
  Lock,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  canModerateThread,
  canPublishToLibrary,
  canViewChannel,
  COMMUNITY_CATEGORIES,
  searchPosts,
  type Channel,
  type Member,
  type Thread,
} from "@/lib/community";
import {
  useCommunity,
  addThread,
  addPost,
  toggleThreadPinned,
  toggleThreadLocked,
  publishToLibrary,
} from "@/components/broker/communityStore";
import {
  formatDate,
  GuardrailComposer,
} from "@/components/broker/community/shared";
import { cn } from "@/lib/utils";

export function CommunityChannels({ member }: { member: Member }) {
  const state = useCommunity();

  const visibleChannels = useMemo(
    () => state.channels.filter((c) => canViewChannel(member, c, state.teams)),
    [state.channels, state.teams, member],
  );

  const [channelId, setChannelId] = useState(
    visibleChannels[0]?.id ?? "",
  );
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const activeChannel =
    visibleChannels.find((c) => c.id === channelId) ?? visibleChannels[0] ?? null;

  const openThread = openThreadId
    ? state.threads.find((t) => t.id === openThreadId) ?? null
    : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      {/* Channel sidebar */}
      <aside className="space-y-1">
        <p className="mb-2 font-mono text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
          Channels
        </p>
        {visibleChannels.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setChannelId(c.id);
              setOpenThreadId(null);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
              c.id === activeChannel?.id
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-ink hover:bg-[var(--surface)]",
            )}
          >
            {c.scope === "team" ? (
              <Users className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Hash className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </aside>

      <div>
        {activeChannel &&
          (openThread ? (
            <ThreadDetail
              thread={openThread}
              channel={activeChannel}
              member={member}
              onBack={() => setOpenThreadId(null)}
            />
          ) : (
            <ChannelThreadList
              channel={activeChannel}
              member={member}
              onOpen={setOpenThreadId}
            />
          ))}
      </div>
    </div>
  );
}

function ChannelThreadList({
  channel,
  member,
  onOpen,
}: {
  channel: Channel;
  member: Member;
  onOpen: (threadId: string) => void;
}) {
  const state = useCommunity();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(COMMUNITY_CATEGORIES[0]);
  const [tags, setTags] = useState("");

  const threads = useMemo(() => {
    const list = state.threads.filter((t) => t.channelId === channel.id);
    return [...list].sort((a, b) =>
      a.pinned === b.pinned ? b.createdAt - a.createdAt : a.pinned ? -1 : 1,
    );
  }, [state.threads, channel.id]);

  async function createThread(body: string) {
    if (!title.trim()) return;
    const id = await addThread({
      channelId: channel.id,
      category,
      title: title.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      authorId: member.id,
      authorName: member.name,
      body,
    });
    setTitle("");
    setTags("");
    setComposing(false);
    onOpen(id);
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-ink">
            {channel.scope === "team" ? (
              <Users className="h-5 w-5" />
            ) : (
              <Hash className="h-5 w-5" />
            )}
            {channel.name}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {channel.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposing((c) => !c)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          <Plus className="h-4 w-4" /> New thread
        </button>
      </div>

      {composing && (
        <div className="mb-4 space-y-3 story-surface p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="field-input"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field-input"
            >
              {COMMUNITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags, comma, separated"
              className="field-input"
            />
          </div>
          <GuardrailComposer
            placeholder="Start the discussion…"
            submitLabel="Post thread"
            onSubmit={createThread}
          />
        </div>
      )}

      {threads.length === 0 ? (
        <p className="story-well border-dashed p-8 text-center text-sm text-[var(--muted)]">
          No threads yet. Start one.
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                className="flex w-full items-center justify-between gap-3 story-surface p-4 text-left hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {t.pinned && <Pin className="h-3.5 w-3.5 text-gold" />}
                    {t.locked && (
                      <Lock className="h-3.5 w-3.5 text-[var(--muted)]" />
                    )}
                    <span className="truncate font-semibold text-ink">
                      {t.title}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                    {t.category} · {t.authorName} · {formatDate(t.createdAt)}
                    {t.libraryFolderId ? " · In Library" : ""}
                  </p>
                </div>
                {t.libraryFolderId && (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-teal-soft" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ThreadDetail({
  thread,
  channel,
  member,
  onBack,
}: {
  thread: Thread;
  channel: Channel;
  member: Member;
  onBack: () => void;
}) {
  const state = useCommunity();
  const [query, setQuery] = useState("");
  const [asUpdate, setAsUpdate] = useState(false);
  const [publishFolder, setPublishFolder] = useState("");

  const team =
    channel.scope === "team"
      ? state.teams.find((t) => t.id === channel.teamId) ?? null
      : null;
  const canModerate = canModerateThread(member, team);
  const canPublish = canPublishToLibrary(member);

  const posts = useMemo(() => {
    const list = state.posts
      .filter((p) => p.threadId === thread.id)
      .sort((a, b) => a.createdAt - b.createdAt);
    return searchPosts(list, query);
  }, [state.posts, thread.id, query]);

  function reply(body: string) {
    addPost({
      threadId: thread.id,
      authorId: member.id,
      authorName: member.name,
      body,
      kind: asUpdate ? "update" : "post",
    });
    setAsUpdate(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {channel.name}
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
        {canModerate && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleThreadPinned(thread.id)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <Pin className="h-3.5 w-3.5" /> {thread.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => toggleThreadLocked(thread.id)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <Lock className="h-3.5 w-3.5" />{" "}
              {thread.locked ? "Unlock" : "Lock"}
            </button>
          </div>
        )}
      </div>

      {/* Broker: publish to library */}
      {canPublish && (
        <div className="story-well mt-3 flex flex-wrap items-center gap-2 p-3">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Knowledge Library
          </span>
          {thread.libraryFolderId ? (
            <span className="text-xs text-teal-soft">
              Published ·{" "}
              {state.libraryFolders.find((f) => f.id === thread.libraryFolderId)
                ?.name ?? "folder"}
            </span>
          ) : (
            <>
              <select
                value={publishFolder}
                onChange={(e) => setPublishFolder(e.target.value)}
                className="h-8 rounded-md border border-hairline bg-[var(--background)] px-2 text-xs text-ink outline-none focus:border-gold"
              >
                <option value="">Choose folder…</option>
                {state.libraryFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!publishFolder}
                onClick={() =>
                  publishFolder &&
                  publishToLibrary(thread.id, publishFolder, member.name)
                }
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold",
                  publishFolder
                    ? "bg-gold text-navy"
                    : "cursor-not-allowed bg-gold/30 text-navy/50",
                )}
              >
                Publish to Library
              </button>
            </>
          )}
        </div>
      )}

      {/* In-thread search */}
      <div className="mt-4 flex items-center gap-2 rounded-md border border-hairline bg-[var(--background)] px-3">
        <Search className="h-4 w-4 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search within this thread…"
          className="h-9 w-full bg-transparent text-sm text-ink outline-none"
        />
      </div>

      {/* Posts */}
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
        {posts.length === 0 && (
          <li className="story-well border-dashed p-6 text-center text-sm text-[var(--muted)]">
            No posts match “{query}”.
          </li>
        )}
      </ul>

      {/* Reply composer */}
      <div className="mt-5 story-surface p-4">
        {thread.locked && !canModerate ? (
          <p className="text-sm text-[var(--muted)]">
            This thread is locked. Only moderators can reply.
          </p>
        ) : (
          <GuardrailComposer
            placeholder={
              asUpdate
                ? "Post a law/notes update to this thread…"
                : "Add a reply or note…"
            }
            submitLabel={asUpdate ? "Post update" : "Reply"}
            onSubmit={reply}
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
        )}
      </div>
    </div>
  );
}
