/**
 * Wave 4 — Suites on the account.
 * Isolated. No production writes.
 * Run: node --experimental-strip-types scripts/test-wave-4-suites.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SUITES_CAPS,
  SUITES_IMPORT_DISMISS_KEY,
  SUITES_STORAGE_KEY,
  dismissedImportMatches,
  importOfferFingerprint,
  localSuitesAreImportable,
  nextCoverTone,
  parseStoredSuites,
  rowToSuite,
  sameAlbumSignature,
  suitesCacheKey,
  type StorySuite,
} from "../src/lib/suites.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const lake: StorySuite = {
  id: "local-1",
  name: "Lake Houses",
  description: "",
  coverTone: nextCoverTone(0),
  listingIds: ["home-a", "home-b"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const lakeCopy: StorySuite = {
  ...lake,
  id: "acct-1",
  listingIds: ["home-b", "home-a"],
};
const invest: StorySuite = {
  ...lake,
  id: "local-2",
  name: "Investment",
  listingIds: ["home-c"],
};

assert.equal(localSuitesAreImportable([]), false);
assert.equal(
  localSuitesAreImportable([{ ...lake, name: "", listingIds: [] }]),
  false,
);
assert.equal(localSuitesAreImportable([lake]), true);
assert.equal(sameAlbumSignature(lake, lakeCopy), true);
assert.equal(sameAlbumSignature(lake, invest), false);
assert.equal(suitesCacheKey("user-a"), "suites:user-a");
assert.notEqual(suitesCacheKey("user-a"), suitesCacheKey("user-b"));

const fp = importOfferFingerprint([invest, lake]);
assert.equal(fp, importOfferFingerprint([lake, invest]));
assert.equal(dismissedImportMatches(fp, [lake, invest]), true);
assert.equal(dismissedImportMatches(fp, [invest]), false);
assert.equal(dismissedImportMatches(null, [lake]), false);

const parsed = parseStoredSuites(
  JSON.stringify([
    lake,
    { ...lake, id: "suite-lake", name: "Legacy demo" },
    { ...lake, id: "suite-invest" },
    { ...lake, id: "suite-mom" },
  ]),
);
assert.equal(parsed?.length, 1);
assert.equal(parsed?.[0]?.id, "local-1");
assert.equal(SUITES_CAPS.maxAlbums, 50);
assert.equal(SUITES_CAPS.maxHomes, 80);
assert.equal(SUITES_STORAGE_KEY, "story-home-suites");
assert.match(SUITES_IMPORT_DISMISS_KEY, /import-dismissed/);

const mapped = rowToSuite(
  {
    id: "acct-9",
    user_id: "user-a",
    name: "For Mom",
    description: "East Texas",
    cover_tone: "from-[#1b5a50] to-[#0E1E38]",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-02T00:00:00.000Z",
  },
  [
    { suite_id: "acct-9", listing_id: "home-2", sort_order: 2, created_at: "b" },
    { suite_id: "acct-9", listing_id: null, sort_order: 1, created_at: "a" },
    { suite_id: "acct-9", listing_id: "home-1", sort_order: 0, created_at: "c" },
  ],
);
assert.deepEqual(mapped.listingIds, ["home-1", "home-2"]);
assert.equal(mapped.description, "East Texas");
assert.equal(mapped.updatedAt, "2026-09-02T00:00:00.000Z");

const ctx = read("src/components/SuitesContext.tsx");
assert.match(ctx, /considerImport/);
assert.match(ctx, /dismissImport/);
assert.match(ctx, /importLocalSuites/);
assert.match(ctx, /writeImportDismissed/);
assert.doesNotMatch(ctx, /auto-assign|autoAssign|mergeLocalIntoAccount/);
assert.match(ctx, /sameAlbumSignature/);
assert.match(ctx, /apiListSuites/);
assert.match(ctx, /setImportOffer\(null\)/);

const library = read("src/components/suites/SuitesLibrary.tsx");
assert.match(library, /Don&apos;t add/);
assert.match(library, /Add selected/);
assert.match(library, /await createSuite/);
assert.match(library, /Could not load albums on your account/);
assert.match(library, /No albums yet/);
assert.match(library, /Loading your albums/);
assert.match(library, /They\s+are not added automatically/);

const modal = read("src/components/suites/SaveToSuiteModal.tsx");
assert.match(modal, /await createSuite/);
assert.match(modal, /await addListingToSuite/);
assert.match(modal, /await removeListingFromSuite/);
assert.match(modal, /listing_saved/);

const player = read("src/components/suites/SuitePlayer.tsx");
assert.match(player, /apiShareSuite/);
assert.match(player, /This home is no longer listed/);
assert.match(player, /canEdit/);
assert.match(player, /Home no longer listed/);

const detail = read("src/app/saved/[suiteId]/page.tsx");
assert.doesNotMatch(detail, /RequireAuth/);
assert.match(detail, /SuitePlayer/);

const listApi = read("src/app/api/suites/route.ts");
assert.match(listApi, /requireSuitesAccess/);
assert.doesNotMatch(listApi, /SERVICE_ROLE|serviceRole|createService/);
assert.match(listApi, /SUITES_CAPS\.maxAlbums/);

const oneApi = read("src/app/api/suites/[id]/route.ts");
assert.match(oneApi, /requireSuitesAccess/);
assert.match(oneApi, /\.eq\("user_id",/);
assert.doesNotMatch(oneApi, /SERVICE_ROLE|serviceRole|createService/);

const itemsApi = read("src/app/api/suites/[id]/items/route.ts");
assert.match(itemsApi, /SUITES_CAPS\.maxHomes/);
assert.match(itemsApi, /listingIds\.includes\(listingId\)/);

const shareApi = read("src/app/api/suites/share/[id]/route.ts");
assert.match(shareApi, /suite_share/);
assert.match(shareApi, /getServerSupabase/);
assert.doesNotMatch(shareApi, /user_id|note/);
assert.doesNotMatch(shareApi, /SERVICE_ROLE|serviceRole|createService/);

const access = read("src/lib/suites-access.ts");
assert.match(access, /requireSignedIn/);
assert.match(access, /decideReadiness/);

const sql = read("supabase/migrations/0054_suites_account.sql");
assert.match(sql, /on delete set null/);
assert.match(sql, /suite_share/);
assert.match(sql, /grant execute on function public\.suite_share/);
assert.match(sql, /suites_select_own/);
assert.match(sql, /Do not auto-assign/);
assert.doesNotMatch(sql, /delete from public\.users/);
assert.doesNotMatch(sql, /truncate /i);

const tsconfig = read("tsconfig.json");
assert.match(tsconfig, /scripts\/test-wave-4-suites\.ts/);

const pkg = read("package.json");
assert.match(pkg, /test:wave-4-suites/);
assert.match(pkg, /test-wave-4-suites\.ts/);

console.log("wave-4-suites: ok");
