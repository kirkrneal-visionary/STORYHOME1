/**
 * Disposable Wave 2 store that applies the same owner / broker predicates
 * as the repo RLS (0002, 0003, 0023, 0025, 0026, 0048).
 * Not production. Not Labs. Not demo mode.
 */

export type Purpose =
  | "consumer"
  | "individual_pro"
  | "managing_broker"
  | "other_professional";

export type ActorId =
  | "homeA"
  | "homeB"
  | "proA"
  | "proB"
  | "officeM"
  | "proC"
  | "officeN"
  | "proD"
  | "otherE"
  | "aal1Pro";

export type Actor = {
  id: ActorId;
  uid: string;
  email: string;
  kind: string;
  purpose: Purpose;
  brokerageId: string | null;
  signedIn: boolean;
  emailConfirmed: boolean;
  enrolled: boolean;
  currentAal: "aal1" | "aal2" | null;
};

export type FarmRow = {
  id: string;
  agent_id: string;
  name: string;
};

export type ProspectRow = {
  id: string;
  agent_id: string;
  label: string;
};

export type FolderRow = {
  id: string;
  owner_id: string;
  name: string;
};

export type FrameRow = {
  id: string;
  owner_id: string;
  folder_id: string;
  name: string;
};

export type HomeRow = {
  id: string;
  owner_id: string;
  nickname: string;
};

export type HomeDocRow = {
  id: string;
  home_id: string;
  owner_id: string;
  title: string;
};

export type ListingRow = {
  id: string;
  agent_id: string;
  brokerage_id: string | null;
  status: string;
  address_serif: string;
};

export type SuiteRow = {
  id: string;
  user_id: string;
  name: string;
};

export type SuiteItemRow = {
  id: string;
  suite_id: string;
  listing_id: string;
};

export type BrokerageRow = {
  id: string;
  broker_id: string;
};

export type IsolationStore = {
  brokerages: BrokerageRow[];
  profiles: Actor[];
  farms: FarmRow[];
  prospects: ProspectRow[];
  folders: FolderRow[];
  frames: FrameRow[];
  homes: HomeRow[];
  homeDocs: HomeDocRow[];
  listings: ListingRow[];
  suites: SuiteRow[];
  suiteItems: SuiteItemRow[];
};

export const WAVE2_PREFIX = "WAVE2-";

export const ACTORS: Record<ActorId, Actor> = {
  homeA: {
    id: "homeA",
    uid: "aaaaaaaa-0001-4000-8000-000000000001",
    email: "wave2-home-a@example.test",
    kind: "consumer",
    purpose: "consumer",
    brokerageId: null,
    signedIn: true,
    emailConfirmed: true,
    enrolled: false,
    currentAal: "aal1",
  },
  homeB: {
    id: "homeB",
    uid: "aaaaaaaa-0002-4000-8000-000000000002",
    email: "wave2-home-b@example.test",
    kind: "consumer",
    purpose: "consumer",
    brokerageId: null,
    signedIn: true,
    emailConfirmed: true,
    enrolled: false,
    currentAal: "aal1",
  },
  proA: {
    id: "proA",
    uid: "bbbbbbbb-0001-4000-8000-000000000001",
    email: "wave2-pro-a@example.test",
    kind: "agent",
    purpose: "individual_pro",
    brokerageId: "brokerage-m",
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  proB: {
    id: "proB",
    uid: "bbbbbbbb-0002-4000-8000-000000000002",
    email: "wave2-pro-b@example.test",
    kind: "agent",
    purpose: "individual_pro",
    brokerageId: null,
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  officeM: {
    id: "officeM",
    uid: "cccccccc-0001-4000-8000-000000000001",
    email: "wave2-office-m@example.test",
    kind: "broker",
    purpose: "managing_broker",
    brokerageId: "brokerage-m",
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  proC: {
    id: "proC",
    uid: "bbbbbbbb-0003-4000-8000-000000000003",
    email: "wave2-pro-c@example.test",
    kind: "agent",
    purpose: "individual_pro",
    brokerageId: "brokerage-m",
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  officeN: {
    id: "officeN",
    uid: "cccccccc-0002-4000-8000-000000000002",
    email: "wave2-office-n@example.test",
    kind: "broker",
    purpose: "managing_broker",
    brokerageId: "brokerage-n",
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  proD: {
    id: "proD",
    uid: "bbbbbbbb-0004-4000-8000-000000000004",
    email: "wave2-pro-d@example.test",
    kind: "agent",
    purpose: "individual_pro",
    brokerageId: "brokerage-n",
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  otherE: {
    id: "otherE",
    uid: "dddddddd-0001-4000-8000-000000000001",
    email: "wave2-other-e@example.test",
    kind: "consumer",
    purpose: "other_professional",
    brokerageId: null,
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal2",
  },
  aal1Pro: {
    id: "aal1Pro",
    uid: "eeeeeeee-0001-4000-8000-000000000001",
    email: "wave2-aal1-pro@example.test",
    kind: "agent",
    purpose: "individual_pro",
    brokerageId: null,
    signedIn: true,
    emailConfirmed: true,
    enrolled: true,
    currentAal: "aal1",
  },
};

function isManagingBroker(actor: Actor): boolean {
  return actor.purpose === "managing_broker";
}

/** 0048 is_broker_of: managing purpose + this brokerage. */
export function isBrokerOf(
  store: IsolationStore,
  brokerageId: string | null,
  actor: Actor,
): boolean {
  if (!brokerageId) return false;
  if (!isManagingBroker(actor)) return false;
  const owns = store.brokerages.some(
    (b) => b.id === brokerageId && b.broker_id === actor.uid,
  );
  const memberOffice =
    actor.brokerageId === brokerageId && actor.purpose === "managing_broker";
  return owns || memberOffice;
}

export function createEmptyStore(): IsolationStore {
  return {
    brokerages: [
      { id: "brokerage-m", broker_id: ACTORS.officeM.uid },
      { id: "brokerage-n", broker_id: ACTORS.officeN.uid },
    ],
    profiles: Object.values(ACTORS),
    farms: [],
    prospects: [],
    folders: [],
    frames: [],
    homes: [],
    homeDocs: [],
    listings: [],
    suites: [],
    suiteItems: [],
  };
}

export function seedWave2Rows(store: IsolationStore): IsolationStore {
  store.farms.push({
    id: "farm-pro-a",
    agent_id: ACTORS.proA.uid,
    name: `${WAVE2_PREFIX}A-farm-polk`,
  });
  store.farms.push({
    id: "farm-pro-b",
    agent_id: ACTORS.proB.uid,
    name: `${WAVE2_PREFIX}B-farm-tyler`,
  });
  store.prospects.push({
    id: "prospect-pro-a",
    agent_id: ACTORS.proA.uid,
    label: `${WAVE2_PREFIX}A-prospect`,
  });
  store.folders.push({
    id: "folder-pro-a",
    owner_id: ACTORS.proA.uid,
    name: `${WAVE2_PREFIX}A-vault`,
  });
  store.frames.push({
    id: "frame-pro-a",
    owner_id: ACTORS.proA.uid,
    folder_id: "folder-pro-a",
    name: `${WAVE2_PREFIX}A-frame`,
  });
  store.homes.push({
    id: "home-a",
    owner_id: ACTORS.homeA.uid,
    nickname: `${WAVE2_PREFIX}A-home`,
  });
  store.homeDocs.push({
    id: "homedoc-a",
    home_id: "home-a",
    owner_id: ACTORS.homeA.uid,
    title: `${WAVE2_PREFIX}A-deed.jpg`,
  });
  store.listings.push({
    id: "listing-c-m",
    agent_id: ACTORS.proC.uid,
    brokerage_id: "brokerage-m",
    status: "Active",
    address_serif: `${WAVE2_PREFIX}C-listing-m`,
  });
  store.listings.push({
    id: "listing-d-n",
    agent_id: ACTORS.proD.uid,
    brokerage_id: "brokerage-n",
    status: "Active",
    address_serif: `${WAVE2_PREFIX}D-listing-n`,
  });
  store.suites.push({
    id: "suite-home-a",
    user_id: ACTORS.homeA.uid,
    name: `${WAVE2_PREFIX}A-suite`,
  });
  store.suiteItems.push({
    id: "suite-item-a",
    suite_id: "suite-home-a",
    listing_id: "listing-c-m",
  });
  return store;
}

export function cleanupWave2(store: IsolationStore): void {
  const wave2Name = (name: string) => name.startsWith(WAVE2_PREFIX);
  store.farms = store.farms.filter((r) => !wave2Name(r.name));
  store.prospects = store.prospects.filter((r) => !wave2Name(r.label));
  store.folders = store.folders.filter((r) => !wave2Name(r.name));
  store.frames = store.frames.filter((r) => !wave2Name(r.name));
  store.homes = store.homes.filter((r) => !wave2Name(r.nickname));
  store.homeDocs = store.homeDocs.filter((r) => !wave2Name(r.title));
  store.listings = store.listings.filter((r) => !wave2Name(r.address_serif));
  store.suites = store.suites.filter((r) => !wave2Name(r.name));
  store.suiteItems = store.suiteItems.filter((r) =>
    store.suites.some((s) => s.id === r.suite_id),
  );
}

function visibleFarms(store: IsolationStore, actor: Actor): FarmRow[] {
  return store.farms.filter((r) => r.agent_id === actor.uid);
}

function visibleProspects(store: IsolationStore, actor: Actor): ProspectRow[] {
  return store.prospects.filter((r) => r.agent_id === actor.uid);
}

function visibleFolders(store: IsolationStore, actor: Actor): FolderRow[] {
  return store.folders.filter((r) => r.owner_id === actor.uid);
}

function visibleFrames(store: IsolationStore, actor: Actor): FrameRow[] {
  return store.frames.filter((r) => r.owner_id === actor.uid);
}

function visibleHomes(store: IsolationStore, actor: Actor): HomeRow[] {
  return store.homes.filter((r) => r.owner_id === actor.uid);
}

function visibleHomeDocs(store: IsolationStore, actor: Actor): HomeDocRow[] {
  return store.homeDocs.filter((r) => r.owner_id === actor.uid);
}

function canUpdateListing(
  store: IsolationStore,
  actor: Actor,
  listing: ListingRow,
): boolean {
  return (
    listing.agent_id === actor.uid ||
    isBrokerOf(store, listing.brokerage_id, actor)
  );
}

function visibleSuites(store: IsolationStore, actor: Actor): SuiteRow[] {
  return store.suites.filter((r) => r.user_id === actor.uid);
}

export type QueryResult<T> = {
  rows: T[];
  leakedForeignBody: boolean;
};

export function asUserSelectFarms(
  store: IsolationStore,
  actor: Actor,
): QueryResult<FarmRow> {
  const rows = visibleFarms(store, actor);
  const leaked = rows.some((r) => r.agent_id !== actor.uid);
  return { rows, leakedForeignBody: leaked };
}

export function asUserGetFarm(
  store: IsolationStore,
  actor: Actor,
  farmId: string,
): QueryResult<FarmRow> {
  const rows = visibleFarms(store, actor).filter((r) => r.id === farmId);
  return { rows, leakedForeignBody: rows.some((r) => r.agent_id !== actor.uid) };
}

export function asUserSelectProspects(
  store: IsolationStore,
  actor: Actor,
): QueryResult<ProspectRow> {
  const rows = visibleProspects(store, actor);
  return { rows, leakedForeignBody: rows.some((r) => r.agent_id !== actor.uid) };
}

export function asUserSelectFrames(
  store: IsolationStore,
  actor: Actor,
): QueryResult<FrameRow> {
  const rows = visibleFrames(store, actor);
  return { rows, leakedForeignBody: rows.some((r) => r.owner_id !== actor.uid) };
}

export function asUserSelectFolders(
  store: IsolationStore,
  actor: Actor,
): QueryResult<FolderRow> {
  const rows = visibleFolders(store, actor);
  return { rows, leakedForeignBody: rows.some((r) => r.owner_id !== actor.uid) };
}

export function asUserSelectHomes(
  store: IsolationStore,
  actor: Actor,
): QueryResult<HomeRow> {
  const rows = visibleHomes(store, actor);
  return { rows, leakedForeignBody: rows.some((r) => r.owner_id !== actor.uid) };
}

export function asUserSelectHomeDocs(
  store: IsolationStore,
  actor: Actor,
): QueryResult<HomeDocRow> {
  const rows = visibleHomeDocs(store, actor);
  return { rows, leakedForeignBody: rows.some((r) => r.owner_id !== actor.uid) };
}

export function asUserSelectSuites(
  store: IsolationStore,
  actor: Actor,
): QueryResult<SuiteRow> {
  const rows = visibleSuites(store, actor);
  return { rows, leakedForeignBody: rows.some((r) => r.user_id !== actor.uid) };
}

export function asUserUpdateListing(
  store: IsolationStore,
  actor: Actor,
  listingId: string,
  status: string,
): { ok: boolean; listing: ListingRow | null } {
  const listing = store.listings.find((r) => r.id === listingId) ?? null;
  if (!listing) return { ok: false, listing: null };
  if (!canUpdateListing(store, actor, listing)) {
    return { ok: false, listing };
  }
  listing.status = status;
  return { ok: true, listing };
}

export function farmCacheKey(userId: string): string {
  return `shi-farms:${userId}`;
}
