#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const out = join(root, "..", `myyanga-v4-preproduction-${stamp}.zip`);

const STAGING_MD_EXCLUDE = [
  "docs/MYYANGA_BUSINESS_PLAN.md",
  "docs/FEATURES_AND_IMPLEMENTATION.md",
];

const REQUIRED_PDFS = [
  "docs/MYYANGA_BUSINESS_PLAN.pdf",
  "docs/FEATURES_AND_IMPLEMENTATION.pdf",
];

console.log("Rendering handoff PDFs…");
execSync("npm run docs:business-pdf && npm run docs:features-pdf", {
  cwd: root,
  stdio: "inherit",
});

for (const pdf of REQUIRED_PDFS) {
  if (!existsSync(join(root, pdf))) {
    console.error(`Missing required PDF: ${pdf}`);
    process.exit(1);
  }
}

console.log("Building dist…");
execSync("npm run build", { cwd: root, stdio: "inherit" });
if (!existsSync(join(root, "dist", "index.html"))) {
  console.error("dist/ missing after build");
  process.exit(1);
}

const zipExcludes = [
  '"node_modules/*"',
  '"node_modules/**"',
  '".git/*"',
  '".git/**"',
  '"*.zip"',
  ...STAGING_MD_EXCLUDE.map((p) => `"${p}"`),
].join(" -x ");

execSync(`rm -f "${out}" && zip -r "${out}" . -x ${zipExcludes}`, {
  cwd: root,
  stdio: "inherit",
});

const stats = execSync(`ls -lh "${out}" && unzip -l "${out}" | tail -3`, { encoding: "utf8" });
console.log(`\nPre-production package: ${out}\n${stats}`);
