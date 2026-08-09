"use client";

import { useSyncExternalStore } from "react";
import {
  resolveMember,
  type Answer,
  type Channel,
  type LibraryFolder,
  type Member,
  type Post,
  type Question,
  type Team,
  type Thread,
} from "@/lib/community";
import { getBrokerageById } from "@/lib/supabase/brokerage";
import * as api from "@/lib/supabase/community";

export interface CommunityState {
  loaded: boolean;
  me: Member | null;
  brokerageName: string;
  members: Member[];
  teams: Team[];
  channels: Channel[];
  threads: Thread[];
  posts: Post[];
  libraryFolders: LibraryFolder[];
  questions: Question[];
  answers: Answer[];
}

const EMPTY: CommunityState = {
  loaded: false,
  me: null,
  brokerageName: "",
  members: [],
  teams: [],
  channels: [],
  threads: [],
  posts: [],
  libraryFolders: [],
  questions: [],
  answers: [],
};

type ActiveUser = { id: string; name: string; initials: string; kind: string };

let store: CommunityState = EMPTY;
let activeUser: ActiveUser | null = null;
const listeners = new Set<() => void>();

function set(next: CommunityState) {
  store = next;
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useCommunity(): CommunityState {
  return useSyncExternalStore(subscribe, () => store, () => EMPTY);
}

export function getEffectiveMember(user: ActiveUser): Member {
  return store.me ?? resolveMember(user);
}

async function reload() {
  const user = activeUser;
  if (!user) return;
  const me = (await api.fetchMyMember(user.id)) ?? resolveMember(user);

  // Q&A is a global forum (any authenticated pro).
  const questions = await api.fetchQuestions();
  const answers = await api.fetchAnswersForQuestions(questions.map((q) => q.id));

  if (!me.brokerageId) {
    set({ ...EMPTY, loaded: true, me, questions, answers });
    return;
  }

  if (me.role === "broker") {
    try { await api.ensureDefaults(me.brokerageId); } catch { /* non-fatal */ }
  }

  const [brokerage, channels, members, libraryFolders, teams] = await Promise.all([
    getBrokerageById(me.brokerageId),
    api.fetchChannels(me.brokerageId),
    api.fetchRoster(me.brokerageId),
    api.fetchFolders(me.brokerageId),
    api.fetchTeams(me.brokerageId),
  ]);
  const threads = await api.fetchThreadsForChannels(channels.map((c) => c.id));
  const posts = await api.fetchPostsForThreads(threads.map((t) => t.id));

  set({
    loaded: true,
    me,
    brokerageName: brokerage?.name ?? "",
    members,
    teams,
    channels,
    threads,
    posts,
    libraryFolders,
    questions,
    answers,
  });
}

export async function loadCommunity(user: ActiveUser) {
  activeUser = user;
  await reload();
}

/* -------------------------------- mutations ------------------------------- */

export async function addThread(input: {
  channelId: string; category: string; title: string; tags: string[]; authorId: string; authorName: string; body: string;
}): Promise<string> {
  const id = await api.addThread(input);
  await reload();
  return id;
}

export async function addPost(input: {
  threadId: string; authorId: string; authorName: string; body: string; kind: "post" | "update";
}): Promise<void> {
  await api.addPost({ threadId: input.threadId, authorId: input.authorId, body: input.body, kind: input.kind });
  await reload();
}

export async function toggleThreadPinned(threadId: string): Promise<void> {
  const t = store.threads.find((x) => x.id === threadId);
  await api.setThreadFlags(threadId, { pinned: !t?.pinned });
  await reload();
}

export async function toggleThreadLocked(threadId: string): Promise<void> {
  const t = store.threads.find((x) => x.id === threadId);
  await api.setThreadFlags(threadId, { locked: !t?.locked });
  await reload();
}

export async function publishToLibrary(threadId: string, folderId: string, reviewedBy: string): Promise<void> {
  await api.publishToLibrary(threadId, folderId, reviewedBy);
  await reload();
}

export async function removeFromLibrary(threadId: string): Promise<void> {
  await api.removeFromLibrary(threadId);
  await reload();
}

export async function markReviewed(threadId: string, reviewedBy: string): Promise<void> {
  await api.markReviewed(threadId, reviewedBy);
  await reload();
}

export async function createFolder(name: string, category: string): Promise<void> {
  if (!store.me?.brokerageId) return;
  await api.createFolder(store.me.brokerageId, name, category);
  await reload();
}

export async function createTeam(input: {
  name: string; leaderId: string; memberIds: string[]; authorized: boolean;
}): Promise<string> {
  if (!store.me?.brokerageId) throw new Error("No brokerage");
  const id = await api.createTeam({ brokerageId: store.me.brokerageId, ...input });
  await reload();
  return id;
}

export async function setTeamLeaderAuthorized(memberId: string, authorized: boolean): Promise<void> {
  await api.setTeamLeaderAuthorized(memberId, authorized);
  await reload();
}

export async function addQuestion(input: {
  category: string; title: string; body: string; tags: string[]; author: Member;
}): Promise<string> {
  const id = await api.addQuestion({ category: input.category, title: input.title, body: input.body, tags: input.tags, authorId: input.author.id });
  await reload();
  return id;
}

export async function addAnswer(input: { questionId: string; body: string; author: Member }): Promise<void> {
  await api.addAnswer({ questionId: input.questionId, authorId: input.author.id, body: input.body });
  await reload();
}

export async function acceptAnswer(questionId: string, answerId: string): Promise<void> {
  await api.acceptAnswer(questionId, answerId);
  await reload();
}
