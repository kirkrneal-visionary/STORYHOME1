/**
 * Story Pro Community — org model, role-based permissions, and the threaded
 * brokerage/knowledge-base + public Q&A data model.
 *
 * Authority is defined ONCE here (org membership + role + broker-granted flags)
 * and consumed by every surface (channels, library, admin, Q&A), so a broker's
 * autonomy "transcribes" across the whole community. Pure module: no React, no
 * browser APIs, so permissions/search/guardrail logic can be unit-verified.
 */

export const COMMUNITY_CATEGORIES = [
  "Finance/Lending",
  "Inspection",
  "Contracts",
  "Appraisal",
  "Market/Data",
  "Legal",
  "Marketing/Tech",
] as const;

export type OrgRole = "broker" | "agent";

export type Member = {
  id: string;
  name: string;
  initials: string;
  role: OrgRole;
  /** Field credential shown as a verified badge (reputation scoring deferred). */
  credential: string;
  brokerageId: string;
  /** Broker-granted right to create teams. */
  teamLeaderAuthorized: boolean;
};

export type Brokerage = {
  id: string;
  name: string;
  brokerLicense: string;
  brokerId: string;
};

export type Team = {
  id: string;
  brokerageId: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  /** Broker authorization — a team is only valid once the broker authorizes it. */
  authorized: boolean;
  createdAt: number;
};

export type Channel = {
  id: string;
  brokerageId: string;
  scope: "brokerage" | "team";
  teamId?: string;
  name: string;
  description: string;
};

export type Thread = {
  id: string;
  channelId: string;
  category: string;
  title: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  tags: string[];
  pinned: boolean;
  locked: boolean;
  /** When set, the thread is published into the Knowledge Library. */
  libraryFolderId: string | null;
  reviewedAsOf: number | null;
  reviewedBy: string | null;
};

export type Post = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
  /** "update" posts are law/notes updates highlighted in the thread changelog. */
  kind: "post" | "update";
};

export type LibraryFolder = {
  id: string;
  brokerageId: string;
  name: string;
  category: string;
};

export type Question = {
  id: string;
  category: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorCredential: string;
  createdAt: number;
  tags: string[];
  acceptedAnswerId: string | null;
};

export type Answer = {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorCredential: string;
  body: string;
  createdAt: number;
};

/* -------------------------------------------------------------------------- */
/* Org seed                                                                     */
/* -------------------------------------------------------------------------- */

export const DEMO_BROKERAGE: Brokerage = {
  id: "brk-storyhome",
  name: "Story Home Realty",
  brokerLicense: "555001",
  brokerId: "user-broker",
};

export const SEED_MEMBERS: Member[] = [
  {
    id: "user-broker",
    name: "Dana Brooks",
    initials: "DB",
    role: "broker",
    credential: "Broker of Record · TREC 555001",
    brokerageId: DEMO_BROKERAGE.id,
    teamLeaderAuthorized: true,
  },
  {
    id: "user-realtor",
    name: "Sarah Jenkins",
    initials: "SJ",
    role: "agent",
    credential: "REALTOR® · TREC 654321",
    brokerageId: DEMO_BROKERAGE.id,
    teamLeaderAuthorized: true,
  },
  {
    id: "m-cole",
    name: "Marcus Cole",
    initials: "MC",
    role: "agent",
    credential: "REALTOR® · TREC 662210",
    brokerageId: DEMO_BROKERAGE.id,
    teamLeaderAuthorized: false,
  },
  {
    id: "m-desai",
    name: "Priya Desai",
    initials: "PD",
    role: "agent",
    credential: "REALTOR®, ABR · TREC 671140",
    brokerageId: DEMO_BROKERAGE.id,
    teamLeaderAuthorized: false,
  },
  {
    id: "m-vega",
    name: "Jordan Vega",
    initials: "JV",
    role: "agent",
    credential: "REALTOR® · TREC 690455",
    brokerageId: DEMO_BROKERAGE.id,
    teamLeaderAuthorized: false,
  },
];

/** Resolve the logged-in user to an org member (falls back to a plain agent). */
export function resolveMember(user: {
  id: string;
  name: string;
  initials: string;
  kind: string;
}): Member {
  const known = SEED_MEMBERS.find((m) => m.id === user.id);
  if (known) return known;
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    role: user.kind === "broker" ? "broker" : "agent",
    credential: user.kind === "broker" ? "Broker of Record" : "REALTOR®",
    brokerageId: DEMO_BROKERAGE.id,
    teamLeaderAuthorized: user.kind === "broker",
  };
}

/* -------------------------------------------------------------------------- */
/* Permissions — the single source of authority                                */
/* -------------------------------------------------------------------------- */

export function isBroker(m: Member): boolean {
  return m.role === "broker";
}

export function canManageRoster(m: Member): boolean {
  return isBroker(m);
}

export function canAuthorizeTeams(m: Member): boolean {
  return isBroker(m);
}

/** Broker, or an agent the broker authorized, may create a team. */
export function canCreateTeam(m: Member): boolean {
  return isBroker(m) || (m.role === "agent" && m.teamLeaderAuthorized);
}

export function canCurateLibrary(m: Member): boolean {
  return isBroker(m);
}

export function canBroadcast(m: Member): boolean {
  return isBroker(m);
}

export function isTeamMember(team: Team, userId: string): boolean {
  return team.leaderId === userId || team.memberIds.includes(userId);
}

/** Broker sees every team (legal oversight); members see their own team. */
export function canViewTeamChannel(m: Member, team: Team): boolean {
  return isBroker(m) || isTeamMember(team, m.id);
}

export function canModerateThread(m: Member, team: Team | null): boolean {
  return isBroker(m) || (team !== null && team.leaderId === m.id);
}

export function canViewChannel(
  m: Member,
  channel: Channel,
  teams: Team[],
): boolean {
  if (channel.brokerageId !== m.brokerageId) return false;
  if (channel.scope === "brokerage") return true;
  const team = teams.find((t) => t.id === channel.teamId) ?? null;
  return team !== null && canViewTeamChannel(m, team);
}

/** Broker publishes to the library; agents may suggest for broker approval. */
export function canPublishToLibrary(m: Member): boolean {
  return isBroker(m);
}

export function canSuggestToLibrary(m: Member): boolean {
  return m.role === "agent";
}

/* -------------------------------------------------------------------------- */
/* Antitrust / commission guardrail                                            */
/* -------------------------------------------------------------------------- */

const ANTITRUST_PATTERNS: RegExp[] = [
  /\b\d+(\.\d+)?\s?%\s?(commission|comm|split|fee)\b/i,
  /\bcommission (rate|rates|split|splits|is|of|should)\b/i,
  /\bstandard commission\b/i,
  /\b(set|fix|agree on|match) (the |our |your )?(rate|rates|commission|price)\b/i,
  /\bcharge (the |a )?(same|standard|\d)/i,
  /\bboycott\b/i,
];

/**
 * Advisory guardrail: flags language that could raise price-fixing/antitrust
 * concerns (especially commission-rate talk among competitors). Non-blocking —
 * the composer shows a disclaimer so pros can reconsider before posting.
 */
export function scanAntitrust(text: string): { flagged: boolean; hits: string[] } {
  const hits: string[] = [];
  for (const rx of ANTITRUST_PATTERNS) {
    const m = text.match(rx);
    if (m) hits.push(m[0]);
  }
  return { flagged: hits.length > 0, hits };
}

/* -------------------------------------------------------------------------- */
/* Search                                                                       */
/* -------------------------------------------------------------------------- */

export function searchThreads(threads: Thread[], query: string): Thread[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads;
  return threads.filter((t) => {
    const hay = `${t.title} ${t.category} ${t.tags.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((p) => p.body.toLowerCase().includes(q));
}

/* -------------------------------------------------------------------------- */
/* Content seed                                                                 */
/* -------------------------------------------------------------------------- */

const B = DEMO_BROKERAGE.id;
const day = 86_400_000;

export function seedTeams(now: number): Team[] {
  return [
    {
      id: "team-lakeside",
      brokerageId: B,
      name: "Lakeside Team",
      leaderId: "user-realtor",
      memberIds: ["user-realtor", "m-cole"],
      authorized: true,
      createdAt: now - 30 * day,
    },
  ];
}

export function seedChannels(): Channel[] {
  return [
    {
      id: "ch-general",
      brokerageId: B,
      scope: "brokerage",
      name: "Brokerage General",
      description: "Whole-office discussion for Story Home Realty.",
    },
    {
      id: "ch-announcements",
      brokerageId: B,
      scope: "brokerage",
      name: "Announcements",
      description: "Broker announcements and compliance bulletins.",
    },
    {
      id: "ch-lakeside",
      brokerageId: B,
      scope: "team",
      teamId: "team-lakeside",
      name: "Lakeside Team",
      description: "Private channel for the Lakeside Team.",
    },
  ];
}

export function seedLibraryFolders(): LibraryFolder[] {
  return COMMUNITY_CATEGORIES.map((c, i) => ({
    id: `fold-${i}`,
    brokerageId: B,
    name: c,
    category: c,
  }));
}

export function seedThreads(now: number): Thread[] {
  return [
    {
      id: "th-fha",
      channelId: "ch-general",
      category: "Finance/Lending",
      title: "FHA vs conventional for first-time buyers in East Texas",
      authorId: "m-cole",
      authorName: "Marcus Cole",
      createdAt: now - 12 * day,
      tags: ["fha", "financing", "first-time"],
      pinned: false,
      locked: false,
      libraryFolderId: "fold-0",
      reviewedAsOf: now - 5 * day,
      reviewedBy: "Dana Brooks",
    },
    {
      id: "th-septic",
      channelId: "ch-general",
      category: "Inspection",
      title: "Septic & well inspection checklist for rural Polk County",
      authorId: "m-desai",
      authorName: "Priya Desai",
      createdAt: now - 9 * day,
      tags: ["septic", "well", "rural"],
      pinned: false,
      locked: false,
      libraryFolderId: "fold-1",
      reviewedAsOf: now - 2 * day,
      reviewedBy: "Dana Brooks",
    },
    {
      id: "th-optionfee",
      channelId: "ch-general",
      category: "Contracts",
      title: "TREC option fee & termination period — how we handle it",
      authorId: "user-realtor",
      authorName: "Sarah Jenkins",
      createdAt: now - 20 * day,
      tags: ["trec", "option-fee", "contract"],
      pinned: true,
      locked: false,
      libraryFolderId: "fold-2",
      reviewedAsOf: now - 1 * day,
      reviewedBy: "Dana Brooks",
    },
    {
      id: "th-welcome",
      channelId: "ch-announcements",
      category: "Legal",
      title: "New agent onboarding — start here",
      authorId: "user-broker",
      authorName: "Dana Brooks",
      createdAt: now - 40 * day,
      tags: ["onboarding", "start-here"],
      pinned: true,
      locked: false,
      libraryFolderId: null,
      reviewedAsOf: null,
      reviewedBy: null,
    },
    {
      id: "th-lakeside-deal",
      channelId: "ch-lakeside",
      category: "Market/Data",
      title: "Lakeside team pipeline — Livingston open houses this weekend",
      authorId: "user-realtor",
      authorName: "Sarah Jenkins",
      createdAt: now - 3 * day,
      tags: ["team", "open-house"],
      pinned: false,
      locked: false,
      libraryFolderId: null,
      reviewedAsOf: null,
      reviewedBy: null,
    },
  ];
}

export function seedPosts(now: number): Post[] {
  return [
    {
      id: "p-fha-1",
      threadId: "th-fha",
      authorId: "m-cole",
      authorName: "Marcus Cole",
      body: "For buyers under ~$350k, FHA's lower down payment usually wins, but watch the MIP. Conventional makes sense with 10%+ down and good credit.",
      createdAt: now - 12 * day,
      kind: "post",
    },
    {
      id: "p-fha-2",
      threadId: "th-fha",
      authorId: "user-realtor",
      authorName: "Sarah Jenkins",
      body: "Agreed. Also flag appraisal requirements — FHA is stricter on property condition for older Livingston homes.",
      createdAt: now - 11 * day,
      kind: "post",
    },
    {
      id: "p-option-1",
      threadId: "th-optionfee",
      authorId: "user-realtor",
      authorName: "Sarah Jenkins",
      body: "Standard practice: deliver the option fee to the seller within 3 days of the effective date; the termination option period runs from the effective date.",
      createdAt: now - 20 * day,
      kind: "post",
    },
    {
      id: "p-option-2",
      threadId: "th-optionfee",
      authorId: "user-broker",
      authorName: "Dana Brooks",
      body: "Law update: as of the latest TREC contract revision, the option fee is delivered to the seller (not title). Update your workflows accordingly.",
      createdAt: now - 1 * day,
      kind: "update",
    },
    {
      id: "p-septic-1",
      threadId: "th-septic",
      authorId: "m-desai",
      authorName: "Priya Desai",
      body: "Checklist: locate the tank & drain field, confirm last pump date, test flow, and get the county permit history for aerobic systems.",
      createdAt: now - 9 * day,
      kind: "post",
    },
    {
      id: "p-welcome-1",
      threadId: "th-welcome",
      authorId: "user-broker",
      authorName: "Dana Brooks",
      body: "Welcome to Story Home Realty. Read the pinned Contracts and Inspection threads first, then introduce yourself in Brokerage General.",
      createdAt: now - 40 * day,
      kind: "post",
    },
    {
      id: "p-lakeside-1",
      threadId: "th-lakeside-deal",
      authorId: "user-realtor",
      authorName: "Sarah Jenkins",
      body: "Two open houses Saturday on Willow St and Overlook Ridge — Marcus, can you cover Overlook 1–3pm?",
      createdAt: now - 3 * day,
      kind: "post",
    },
  ];
}

export function seedQuestions(now: number): Question[] {
  return [
    {
      id: "q-daysonmarket",
      category: "Market/Data",
      title: "Typical days-on-market for acreage in Tyler County right now?",
      body: "Client with a 40-acre listing near Woodville. What's realistic DOM in this segment?",
      authorId: "m-vega",
      authorName: "Jordan Vega",
      authorCredential: "REALTOR® · TREC 690455",
      createdAt: now - 2 * day,
      tags: ["dom", "acreage", "tyler-county"],
      acceptedAnswerId: "a-dom-1",
    },
    {
      id: "q-appraisalgap",
      category: "Appraisal",
      title: "How are you handling appraisal gaps on rural comps?",
      body: "Limited comps in San Jacinto County keep coming in low. Appraisers — what supports value best?",
      authorId: "m-cole",
      authorName: "Marcus Cole",
      authorCredential: "REALTOR® · TREC 662210",
      createdAt: now - 4 * day,
      tags: ["appraisal", "gap", "rural"],
      acceptedAnswerId: null,
    },
  ];
}

export function seedAnswers(now: number): Answer[] {
  return [
    {
      id: "a-dom-1",
      questionId: "q-daysonmarket",
      authorId: "m-desai",
      authorName: "Priya Desai",
      authorCredential: "REALTOR®, ABR · TREC 671140",
      body: "Acreage 20+ ac near Woodville is averaging ~90–120 DOM this quarter. Price to the land value and market to out-of-county buyers.",
      createdAt: now - 2 * day,
    },
  ];
}
