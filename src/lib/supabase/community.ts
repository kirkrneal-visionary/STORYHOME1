"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  COMMUNITY_CATEGORIES,
  type Answer,
  type Channel,
  type LibraryFolder,
  type Member,
  type OrgRole,
  type Post,
  type Question,
  type Team,
  type Thread,
} from "@/lib/community";

function client() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  return s;
}

const ms = (t: string | null | undefined) => (t ? new Date(t).getTime() : 0);
const initialsOf = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

/* eslint-disable @typescript-eslint/no-explicit-any */
function toMember(r: any): Member {
  const role: OrgRole = r.account_kind === "broker" ? "broker" : "agent";
  const name = r.full_name || r.email || "Member";
  return {
    id: r.id,
    name,
    initials: r.initials || initialsOf(name),
    role,
    credential: r.credential ?? r.professional_role ?? "",
    brokerageId: r.brokerage_id ?? "",
    teamLeaderAuthorized: Boolean(r.team_leader_authorized),
  };
}

function toThread(r: any): Thread {
  return {
    id: r.id,
    channelId: r.channel_id,
    category: r.category,
    title: r.title,
    authorId: r.author_id,
    authorName: r.author?.full_name ?? "Member",
    createdAt: ms(r.created_at),
    tags: r.tags ?? [],
    pinned: Boolean(r.pinned),
    locked: Boolean(r.locked),
    libraryFolderId: r.library_folder_id ?? null,
    reviewedAsOf: r.reviewed_as_of ? ms(r.reviewed_as_of) : null,
    reviewedBy: r.reviewed_by ?? null,
  };
}

function toPost(r: any): Post {
  return {
    id: r.id,
    threadId: r.thread_id,
    authorId: r.author_id,
    authorName: r.author?.full_name ?? "Member",
    body: r.body,
    createdAt: ms(r.created_at),
    kind: r.kind === "update" ? "update" : "post",
  };
}

function toQuestion(r: any): Question {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    body: r.body,
    authorId: r.author_id,
    authorName: r.author?.full_name ?? "Member",
    authorCredential: r.author?.credential ?? "",
    createdAt: ms(r.created_at),
    tags: r.tags ?? [],
    acceptedAnswerId: r.accepted_answer_id ?? null,
  };
}

function toAnswer(r: any): Answer {
  return {
    id: r.id,
    questionId: r.question_id,
    authorId: r.author_id,
    authorName: r.author?.full_name ?? "Member",
    authorCredential: r.author?.credential ?? "",
    body: r.body,
    createdAt: ms(r.created_at),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const THREAD_SELECT = "*, author:profiles!threads_author_id_fkey(full_name)";
const POST_SELECT = "*, author:profiles!posts_author_id_fkey(full_name)";
const Q_SELECT = "*, author:profiles!questions_author_id_fkey(full_name, credential)";
const A_SELECT = "*, author:profiles!answers_author_id_fkey(full_name, credential)";

export async function fetchMyMember(userId: string): Promise<Member | null> {
  const { data, error } = await client()
    .from("profiles")
    .select("id, full_name, email, initials, account_kind, professional_role, credential, brokerage_id, team_leader_authorized")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toMember(data) : null;
}

export async function fetchRoster(brokerageId: string): Promise<Member[]> {
  const { data, error } = await client()
    .from("profiles")
    .select("id, full_name, email, initials, account_kind, professional_role, credential, brokerage_id, team_leader_authorized")
    .eq("brokerage_id", brokerageId);
  if (error) throw error;
  return (data ?? []).map(toMember);
}

export async function fetchChannels(brokerageId: string): Promise<Channel[]> {
  const { data, error } = await client()
    .from("channels")
    .select("id, brokerage_id, scope, team_id, name, description")
    .eq("brokerage_id", brokerageId);
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((r: any) => ({
    id: r.id,
    brokerageId: r.brokerage_id,
    scope: r.scope,
    teamId: r.team_id ?? undefined,
    name: r.name,
    description: r.description ?? "",
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function fetchThreadsForChannels(channelIds: string[]): Promise<Thread[]> {
  if (channelIds.length === 0) return [];
  const { data, error } = await client()
    .from("threads")
    .select(THREAD_SELECT)
    .in("channel_id", channelIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toThread);
}

export async function fetchPostsForThreads(threadIds: string[]): Promise<Post[]> {
  if (threadIds.length === 0) return [];
  const { data, error } = await client()
    .from("posts")
    .select(POST_SELECT)
    .in("thread_id", threadIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toPost);
}

export async function fetchFolders(brokerageId: string): Promise<LibraryFolder[]> {
  const { data, error } = await client()
    .from("library_folders")
    .select("id, brokerage_id, name, category")
    .eq("brokerage_id", brokerageId);
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((r: any) => ({
    id: r.id,
    brokerageId: r.brokerage_id,
    name: r.name,
    category: r.category,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function fetchTeams(brokerageId: string): Promise<Team[]> {
  const { data, error } = await client()
    .from("teams")
    .select("id, brokerage_id, name, leader_id, authorized, created_at, team_members(member_id)")
    .eq("brokerage_id", brokerageId);
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((r: any) => ({
    id: r.id,
    brokerageId: r.brokerage_id,
    name: r.name,
    leaderId: r.leader_id,
    memberIds: Array.from(
      new Set([r.leader_id, ...(r.team_members ?? []).map((m: any) => m.member_id)]),
    ),
    authorized: Boolean(r.authorized),
    createdAt: ms(r.created_at),
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function fetchQuestions(): Promise<Question[]> {
  const { data, error } = await client()
    .from("questions")
    .select(Q_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toQuestion);
}

export async function fetchAnswersForQuestions(questionIds: string[]): Promise<Answer[]> {
  if (questionIds.length === 0) return [];
  const { data, error } = await client()
    .from("answers")
    .select(A_SELECT)
    .in("question_id", questionIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toAnswer);
}

/** Broker bootstrap: create default channels + category folders if none exist. */
export async function ensureDefaults(brokerageId: string): Promise<void> {
  const s = client();
  const [{ count: chCount }, { count: folCount }] = await Promise.all([
    s.from("channels").select("id", { count: "exact", head: true }).eq("brokerage_id", brokerageId),
    s.from("library_folders").select("id", { count: "exact", head: true }).eq("brokerage_id", brokerageId),
  ]);
  if ((chCount ?? 0) === 0) {
    await s.from("channels").insert([
      { brokerage_id: brokerageId, scope: "brokerage", name: "Brokerage General", description: "Whole-office discussion." },
      { brokerage_id: brokerageId, scope: "brokerage", name: "Announcements", description: "Broker announcements & policy." },
    ]);
  }
  if ((folCount ?? 0) === 0) {
    await s.from("library_folders").insert(
      COMMUNITY_CATEGORIES.map((c) => ({ brokerage_id: brokerageId, name: c, category: c })),
    );
  }
}

/* --------------------------------- writes -------------------------------- */

export async function addThread(input: {
  channelId: string; category: string; title: string; tags: string[]; authorId: string; body: string;
}): Promise<string> {
  const s = client();
  const { data, error } = await s
    .from("threads")
    .insert({ channel_id: input.channelId, category: input.category, title: input.title, tags: input.tags, author_id: input.authorId })
    .select("id")
    .single();
  if (error) throw error;
  const threadId = data.id as string;
  const { error: e2 } = await s.from("posts").insert({ thread_id: threadId, author_id: input.authorId, body: input.body, kind: "post" });
  if (e2) throw e2;
  return threadId;
}

export async function addPost(input: {
  threadId: string; authorId: string; body: string; kind: "post" | "update";
}): Promise<void> {
  const { error } = await client().from("posts").insert({ thread_id: input.threadId, author_id: input.authorId, body: input.body, kind: input.kind });
  if (error) throw error;
}

export async function setThreadFlags(threadId: string, patch: { pinned?: boolean; locked?: boolean }): Promise<void> {
  const { error } = await client().from("threads").update(patch).eq("id", threadId);
  if (error) throw error;
}

export async function publishToLibrary(threadId: string, folderId: string, reviewedBy: string): Promise<void> {
  const { error } = await client()
    .from("threads")
    .update({ library_folder_id: folderId, reviewed_as_of: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq("id", threadId);
  if (error) throw error;
}

export async function removeFromLibrary(threadId: string): Promise<void> {
  const { error } = await client().from("threads").update({ library_folder_id: null }).eq("id", threadId);
  if (error) throw error;
}

export async function markReviewed(threadId: string, reviewedBy: string): Promise<void> {
  const { error } = await client()
    .from("threads")
    .update({ reviewed_as_of: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq("id", threadId);
  if (error) throw error;
}

export async function createFolder(brokerageId: string, name: string, category: string): Promise<void> {
  const { error } = await client().from("library_folders").insert({ brokerage_id: brokerageId, name, category });
  if (error) throw error;
}

export async function createTeam(input: {
  brokerageId: string; name: string; leaderId: string; memberIds: string[]; authorized: boolean;
}): Promise<string> {
  const s = client();
  const { data, error } = await s
    .from("teams")
    .insert({ brokerage_id: input.brokerageId, name: input.name, leader_id: input.leaderId, authorized: input.authorized })
    .select("id")
    .single();
  if (error) throw error;
  const teamId = data.id as string;
  const members = Array.from(new Set(input.memberIds.filter((m) => m && m !== input.leaderId)));
  if (members.length) {
    const { error: e2 } = await s.from("team_members").insert(members.map((m) => ({ team_id: teamId, member_id: m })));
    if (e2) throw e2;
  }
  const { error: e3 } = await s.from("channels").insert({
    brokerage_id: input.brokerageId, scope: "team", team_id: teamId, name: `${input.name} Team`, description: `Private channel for ${input.name}.`,
  });
  if (e3) throw e3;
  return teamId;
}

export async function setTeamLeaderAuthorized(agentId: string, authorized: boolean): Promise<boolean> {
  const { data, error } = await client().rpc("set_team_leader_authorized", { p_agent: agentId, p_authorized: authorized });
  if (error) throw error;
  return Boolean(data);
}

export async function addQuestion(input: {
  category: string; title: string; body: string; tags: string[]; authorId: string;
}): Promise<string> {
  const { data, error } = await client()
    .from("questions")
    .insert({ category: input.category, title: input.title, body: input.body, tags: input.tags, author_id: input.authorId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addAnswer(input: { questionId: string; authorId: string; body: string }): Promise<void> {
  const { error } = await client().from("answers").insert({ question_id: input.questionId, author_id: input.authorId, body: input.body });
  if (error) throw error;
}

export async function acceptAnswer(questionId: string, answerId: string): Promise<void> {
  const { error } = await client().from("questions").update({ accepted_answer_id: answerId }).eq("id", questionId);
  if (error) throw error;
}
