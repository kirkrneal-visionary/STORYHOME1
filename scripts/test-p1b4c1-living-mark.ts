/**
 * P1B-4C1 Professional Living Mark focused control.
 * Presentation/navigation only. Existing Living Mark library.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1b4c1-living-mark.ts
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import {
  buildSettingsHref,
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const params = (q: string) => new URLSearchParams(q);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const broker = settingsCapabilities({
  purpose: "individual_pro",
  kind: "broker",
});
const managing = settingsCapabilities({
  purpose: "managing_broker",
  kind: "broker",
});
const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});

assert.equal(consumer.livingMark, false);
assert.equal(agent.livingMark, true);
assert.equal(broker.livingMark, true);
assert.equal(managing.livingMark, true);
assert.equal(other.livingMark, false);

assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=living")),
    consumer,
  ).screen,
  "root",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=living")),
    other,
  ).screen,
  "category",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=living")),
    agent,
  ).control,
  "living",
);
assert.equal(
  resolveSettingsLocation(
    parseSettingsSearch(params("category=professional&control=living")),
    managing,
  ).control,
  "living",
);
assert.equal(
  buildSettingsHref({
    category: "professional",
    control: "living",
    from: "/portal",
  }),
  "/settings?category=professional&control=living&from=%2Fportal",
);

const view = read("src/components/settings/SettingsView.tsx");
assert.match(view, /title="Living Mark"/);
assert.match(view, /control: "living"/);
assert.match(view, /LivingMarkLibraryCard/);
assert.match(view, /caps\.livingMark && !consumerPreview/);
assert.match(view, /title="Professional Identity"/);
assert.match(view, /title="Professional Profile"/);
assert.doesNotMatch(view, /title="Stories"|title="County Story"|title="Professional Story"/);
assert.doesNotMatch(view, /24-hour|Open House|Story carousel/);

const card = read("src/components/settings/LivingMarkLibraryCard.tsx");
assert.match(card, /uploadLivingMarkFromLibrary/);
assert.match(card, /type="file"/);
assert.match(card, /accept="image\/\*,video\/\*"/);
assert.match(card, /Choose from library/);
assert.doesNotMatch(card, /type="url"|paste a URL/);
assert.doesNotMatch(card, /County Story|24-hour/);

const agents = read("src/components/agents/AgentWorldView.tsx");
assert.match(agents, /LivingMarkPresence/);
assert.doesNotMatch(agents, /ProfessionalProfileControl|settings-row-living/);

const capsSrc = read("src/lib/account/settings-capabilities.ts");
assert.match(capsSrc, /livingMark/);
assert.doesNotMatch(capsSrc, /other_professional.*livingMark/);

const migrations = readdirSync(join(root, "supabase/migrations"));
assert.equal(migrations.filter((f) => /p1b4c1|living_mark_settings/i.test(f)).length, 0);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /react-dropzone|uppy|filepond/);

console.log("p1b4c1-living-mark: ok");
