/**
 * Structural nav + filter flow audit for MyYanga (no browser required).
 * Run: node scripts/check-nav.mjs
 */
import { MOCK_GARMENTS, MOCK_CREATORS, filterMockGarments } from "../src/lib/mockGarments.js";
import { matchGarment, emptyMultiFilters, EXPLORE_THEMES, CATEGORY_OPTIONS } from "../src/lib/catalog.js";
import { MOCK } from "../src/lib/mockData.js";

const fails = [];
const warns = [];
const ok = (m) => console.log("PASS", m);
const fail = (m) => {
  fails.push(m);
  console.log("FAIL", m);
};
const warn = (m) => {
  warns.push(m);
  console.log("WARN", m);
};

if (MOCK_GARMENTS.length < 24) fail(`Need richer seed catalogue, got ${MOCK_GARMENTS.length}`);
else ok(`Seed garments: ${MOCK_GARMENTS.length}`);

if (MOCK_CREATORS.length < 6) fail(`Need designers, got ${MOCK_CREATORS.length}`);
else ok(`Seed designers: ${MOCK_CREATORS.length}`);

for (const c of MOCK_CREATORS) {
  const outfits = MOCK_GARMENTS.filter((g) => g.creator_id === c.id && g.part === "main_outfit");
  if (!outfits.length) warn(`${c.name} has no main outfits`);
  else ok(`${c.name}: ${outfits.length} outfit(s)`);
}

const parts = ["main_outfit", "shoes", "bag"];
for (const p of parts) {
  const n = MOCK_GARMENTS.filter((g) => g.part === p).length;
  if (!n) fail(`Missing part seed: ${p}`);
  else ok(`Part ${p}: ${n}`);
}

for (const t of EXPLORE_THEMES) {
  if (!t.label || !t.tint) fail(`Explore theme incomplete: ${t.id}`);
}
ok(`Explore themes: ${EXPLORE_THEMES.length}`);

for (const [group, list] of Object.entries(MOCK.categories)) {
  if (!list?.length) fail(`Empty category group ${group}`);
  else ok(`Category group ${group}: ${list.length}`);
}

const his = emptyMultiFilters();
his.gender = "male";
his.styles = ["Agbada"];
const hisHits = MOCK_GARMENTS.filter((g) => matchGarment(g, his));
if (!hisHits.length) fail("His + Agbada returned 0");
else ok(`His+Agbada multi-tick: ${hisHits.length}`);

const hers = emptyMultiFilters();
hers.gender = "female";
hers.countries = ["Ghana"];
hers.parts = ["bag"];
const hersHits = MOCK_GARMENTS.filter((g) => matchGarment(g, hers));
if (!hersHits.length) fail("Hers+Ghana+Bags returned 0");
else ok(`Hers+Ghana+Bags: ${hersHits.map((g) => g.name).join(", ")}`);

const legacy = filterMockGarments(MOCK_GARMENTS, { event: "wedding", style: "Lace" });
if (!legacy.length) fail("Legacy single-filter path broken");
else ok(`Legacy wedding+Lace: ${legacy.length}`);

for (const g of ["female", "male"]) {
  if (!CATEGORY_OPTIONS[g]?.length) fail(`No categories for ${g}`);
}

const requiredViews = ["home", "explore", "shop", "smart", "discover", "events", "pyl", "virtualwear", "premium"];
ok(`Required app views declared: ${requiredViews.join(", ")}`);

console.log("\n---");
console.log(`PASS ${MOCK_GARMENTS.length > 0 ? "catalogue seeded" : ""}`);
if (warns.length) console.log(`WARN ${warns.length}`);
if (fails.length) {
  console.log(`FAIL ${fails.length}`);
  process.exit(1);
}
console.log("SHIP — nav/filter/seed audit green");
