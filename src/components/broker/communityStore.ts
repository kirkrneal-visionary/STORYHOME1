"use client";

import { useSyncExternalStore } from "react";
import {
  resolveMember,
  seedChannels,
  seedLibraryFolders,
  seedPosts,
  seedQuestions,
  seedAnswers,
  seedThreads,
  seedTeams,
  SEED_MEMBERS,
  DEMO_BROKERAGE,
  type Answer,
  type Channel,
  type LibraryFolder,
  type Member,
  type Post,
  type Question,
  type Team,
  type Thread,
} from "@/lib/community";

const STORAGE_KEY = "story-home-community";

export type CommunityState = {
  members: Member[];
  teams: Team[];
  channels: Channel[];
  threads: Thread[];
  posts: Post[];
  libraryFolders: LibraryFolder[];
  questions: Question[];
  answers: Answer[];
};

function buildSeed(): CommunityState {
  const now = Date.now();
  return {
    members: SEED_MEMBERS.map((m) => ({ ...m })),
    teams: seedTeams(now),
    channels: seedChannels(),
    threads: seedThreads(now),
    posts: seedPosts(now),
    libraryFolders: seedLibraryFolders(),
    questions: seedQuestions(now),
    answers: seedAnswers(now),
  };
}

const SEED: CommunityState = buildSeed();

let store: CommunityState | null = null;
const listeners = new Set<() => void>();

function load(): CommunityState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CommunityState;
      if (parsed && Array.isArray(parsed.channels)) return parsed;
    }
  } catch {
    // ignore
  }
  return SEED;
}

function persist(next: CommunityState) {
  store = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): CommunityState {
  if (store === null) store = load();
  return store;
}

function getServerSnapshot(): CommunityState {
  return SEED;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCommunity(): CommunityState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function update(mutator: (s: CommunityState) => CommunityState) {
  persist(mutator(getSnapshot()));
}

/** Resolve a logged-in user to the effective member (store roster first). */
export function getEffectiveMember(user: {
  id: string;
  name: string;
  initials: string;
  kind: string;
}): Member {
  const fromStore = getSnapshot().members.find((m) => m.id === user.id);
  return fromStore ?? resolveMember(user);
}

/* ---- Threads & posts ---- */

export function addThread(input: {
  channelId: string;
  category: string;
  title: string;
  tags: string[];
  authorId: string;
  authorName: string;
  body: string;
}): string {
  const now = Date.now();
  const threadId = uid("th");
  update((s) => ({
    ...s,
    threads: [
      {
        id: threadId,
        channelId: input.channelId,
        category: input.category,
        title: input.title,
        authorId: input.authorId,
        authorName: input.authorName,
        createdAt: now,
        tags: input.tags,
        pinned: false,
        locked: false,
        libraryFolderId: null,
        reviewedAsOf: null,
        reviewedBy: null,
      },
      ...s.threads,
    ],
    posts: [
      ...s.posts,
      {
        id: uid("p"),
        threadId,
        authorId: input.authorId,
        authorName: input.authorName,
        body: input.body,
        createdAt: now,
        kind: "post",
      },
    ],
  }));
  return threadId;
}

export function addPost(input: {
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  kind: "post" | "update";
}) {
  update((s) => ({
    ...s,
    posts: [
      ...s.posts,
      {
        id: uid("p"),
        threadId: input.threadId,
        authorId: input.authorId,
        authorName: input.authorName,
        body: input.body,
        createdAt: Date.now(),
        kind: input.kind,
      },
    ],
  }));
}

export function toggleThreadPinned(threadId: string) {
  update((s) => ({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId ? { ...t, pinned: !t.pinned } : t,
    ),
  }));
}

export function toggleThreadLocked(threadId: string) {
  update((s) => ({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId ? { ...t, locked: !t.locked } : t,
    ),
  }));
}

/* ---- Library ---- */

export function publishToLibrary(
  threadId: string,
  folderId: string,
  reviewedBy: string,
) {
  update((s) => ({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            libraryFolderId: folderId,
            reviewedAsOf: Date.now(),
            reviewedBy,
          }
        : t,
    ),
  }));
}

export function removeFromLibrary(threadId: string) {
  update((s) => ({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId
        ? { ...t, libraryFolderId: null, reviewedAsOf: null, reviewedBy: null }
        : t,
    ),
  }));
}

export function markReviewed(threadId: string, reviewedBy: string) {
  update((s) => ({
    ...s,
    threads: s.threads.map((t) =>
      t.id === threadId ? { ...t, reviewedAsOf: Date.now(), reviewedBy } : t,
    ),
  }));
}

export function createFolder(name: string, category: string) {
  update((s) => ({
    ...s,
    libraryFolders: [
      ...s.libraryFolders,
      { id: uid("fold"), brokerageId: DEMO_BROKERAGE.id, name, category },
    ],
  }));
}

/* ---- Teams & roster ---- */

export function createTeam(input: {
  name: string;
  leaderId: string;
  memberIds: string[];
  authorized: boolean;
}): string {
  const teamId = uid("team");
  update((s) => ({
    ...s,
    teams: [
      ...s.teams,
      {
        id: teamId,
        brokerageId: DEMO_BROKERAGE.id,
        name: input.name,
        leaderId: input.leaderId,
        memberIds: Array.from(new Set([input.leaderId, ...input.memberIds])),
        authorized: input.authorized,
        createdAt: Date.now(),
      },
    ],
    channels: [
      ...s.channels,
      {
        id: uid("ch"),
        brokerageId: DEMO_BROKERAGE.id,
        scope: "team",
        teamId,
        name: input.name,
        description: `Private channel for ${input.name}.`,
      },
    ],
  }));
  return teamId;
}

export function setTeamLeaderAuthorized(memberId: string, authorized: boolean) {
  update((s) => ({
    ...s,
    members: s.members.map((m) =>
      m.id === memberId ? { ...m, teamLeaderAuthorized: authorized } : m,
    ),
  }));
}

/* ---- Q&A ---- */

export function addQuestion(input: {
  category: string;
  title: string;
  body: string;
  tags: string[];
  author: Member;
}): string {
  const id = uid("q");
  update((s) => ({
    ...s,
    questions: [
      {
        id,
        category: input.category,
        title: input.title,
        body: input.body,
        authorId: input.author.id,
        authorName: input.author.name,
        authorCredential: input.author.credential,
        createdAt: Date.now(),
        tags: input.tags,
        acceptedAnswerId: null,
      },
      ...s.questions,
    ],
  }));
  return id;
}

export function addAnswer(input: {
  questionId: string;
  body: string;
  author: Member;
}) {
  update((s) => ({
    ...s,
    answers: [
      ...s.answers,
      {
        id: uid("a"),
        questionId: input.questionId,
        authorId: input.author.id,
        authorName: input.author.name,
        authorCredential: input.author.credential,
        body: input.body,
        createdAt: Date.now(),
      },
    ],
  }));
}

export function acceptAnswer(questionId: string, answerId: string) {
  update((s) => ({
    ...s,
    questions: s.questions.map((q) =>
      q.id === questionId ? { ...q, acceptedAnswerId: answerId } : q,
    ),
  }));
}

export function resetCommunity() {
  persist(buildSeed());
}
