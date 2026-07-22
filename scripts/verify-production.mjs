#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0, fail = 0;
const check = (n, c) => { if (c) { console.log("OK  ", n); ok++; } else { console.log("FAIL", n); fail++; } };

const files = [
  "supabase/migrations/004_production_core.sql",
  "supabase/migrations/005_monetization.sql",
  "supabase/migrations/006_seed_production.sql",
  "supabase/functions/payments/index.ts",
  "supabase/functions/smart-search/index.ts",
  "supabase/functions/virtual-tryon/index.ts",
  "src/lib/monetization.js",
  "src/lib/virtualWear.js",
  "src/lib/smartSearch.js",
  "src/components/PayGate.jsx",
  "src/components/MonetizationStudio.jsx",
  "src/pages/VirtualWearPage.jsx",
  "src/pages/SmartSearchPage.jsx",
  "src/pages/EventsPage.jsx",
  "src/pages/LookSharePage.jsx",
  "src/pages/PYLPage.jsx",
  "src/lib/adminDelete.js",
  "src/lib/accessControl.js",
  "src/lib/accessControlConstants.js",
  "src/components/AccessControlStudio.jsx",
  "supabase/migrations/007_access_control.sql",
  ".env.example",
];
for (const f of files) check(f, existsSync(join(root, f)));

const mig = readFileSync(join(root, "supabase/migrations/005_monetization.sql"), "utf8");
check("monetization_settings", mig.includes("monetization_settings"));
check("get_feature_gate", mig.includes("get_feature_gate"));
check("fulfil_payment", mig.includes("fulfil_payment"));
check("entitlements", mig.includes("entitlements"));

const core = readFileSync(join(root, "supabase/migrations/004_production_core.sql"), "utf8");
check("creators table", core.includes("creators"));
check("garments table", core.includes("garments"));
check("looks + comments", core.includes("look_comments"));
check("profiles RLS fixed", core.includes("profiles_self_read"));

const pay = readFileSync(join(root, "supabase/functions/payments/index.ts"), "utf8");
check("flutterwave cascade", pay.includes("flutterwave"));
check("paystack cascade", pay.includes("paystack"));
check("stripe cascade", pay.includes("stripe"));
check("payment auth required", pay.includes("Unauthorized"));

const access = readFileSync(join(root, "supabase/migrations/007_access_control.sql"), "utf8");
check("founding owner email", access.includes("oadeagbo@gmail.com"));
check("transfer_super_admin", access.includes("transfer_super_admin"));
check("add_co_owner", access.includes("add_co_owner"));
check("grant_privileges", access.includes("grant_privileges"));

const hooks = readFileSync(join(root, "src/hooks.js"), "utf8");
check("Google login", hooks.includes("loginWithGoogle") && hooks.includes("signInWithOAuth"));
check("founding claim", hooks.includes("claimFoundingOwner") || hooks.includes("FOUNDING_OWNER_EMAIL"));

const app = readFileSync(join(root, "src/myyanga-app.jsx"), "utf8");
check("MonetizationStudio tab", app.includes("MonetizationStudio"));
check("AccessControlStudio", app.includes("AccessControlStudio"));
check("Continue with Google", app.includes("Continue with Google"));
check("VirtualWearPage", app.includes("VirtualWearPage"));
check("SmartSearchPage", app.includes("SmartSearchPage"));
check("LookSharePage", app.includes("LookSharePage"));
check("PYLPage + vote", app.includes("PYLPage"));
check("mode toggle", app.includes("Go PRODUCTION"));
check("mock garments", existsSync(join(root, "src/lib/mockGarments.js")));
check("test store", existsSync(join(root, "src/lib/testStore.js")));
const studio = readFileSync(join(root, "src/components/ContentStudio.jsx"), "utf8");
check("studio garment uploads", studio.includes("Save garment for testing"));
check("testing mode auth", readFileSync(join(root, "src/hooks.js"), "utf8").includes("authenticateTester"));
check("no demo password in UI", !app.includes("MyYanga2026!"));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
