#!/usr/bin/env node
/**
 * Regenerate docs/MYYANGA_V4_ARCHITECTURE_VISUAL.html with base64-embedded PNGs
 * so screenshots display when the HTML is opened offline / emailed.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "docs/assets");
const out = join(root, "docs/MYYANGA_V4_ARCHITECTURE_VISUAL.html");

const shots = [
  ["Home", "myyanga-home.png"],
  ["Settings — profile + reel schedule (filled)", "myyanga-settings-filled.png"],
  ["Settings — empty chrome", "myyanga-settings.png"],
  ["Virtual Wear", "myyanga-virtualwear.png"],
  ["Discover — promoted pool", "myyanga-discover.png"],
  ["Reels inbox", "myyanga-reels.png"],
  ["Smart Search", "myyanga-smartsearch-results.png"],
  ["Blog index", "myyanga-blog.png"],
  ["Blog article", "myyanga-article.png"],
  ["Bag", "myyanga-bag.png"],
  ["Product detail (PDP)", "myyanga-pdp.png"],
  ["Sign in", "myyanga-login.png"],
  ["Admin console", "myyanga-admin.png"],
  ["Admin — E-vetting / CAC", "myyanga-evetting.png"],
  ["Access Control", "myyanga-accesscontrol.png"],
  ["Monetization", "myyanga-monetization.png"],
];

function dataUri(name) {
  const p = join(assets, name);
  if (!existsSync(p)) return null;
  const b64 = readFileSync(p).toString("base64");
  return `data:image/png;base64,${b64}`;
}

const sections = shots
  .map(([title, file]) => {
    const src = dataUri(file);
    if (!src) return `<!-- missing ${file} -->`;
    return `<h2>${title}</h2><figure><img src="${src}" alt="${title}"/><figcaption>${file}</figcaption></figure>`;
  })
  .filter((s) => !s.startsWith("<!--"))
  .join("\n");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>MyYanga v4 — Visual Architecture</title>
<style>
body{font-family:Georgia,'Playfair Display',serif;max-width:980px;margin:40px auto;padding:0 20px;color:#1a1512;background:#f7f4ef}
h1{color:#850713} h2{margin-top:2.5rem;border-bottom:2px solid #850713;padding-bottom:6px;font-size:1.25rem}
figure{margin:1rem 0 2rem;background:#fff;border:1px solid #ddd;padding:12px}
img{max-width:100%;height:auto;display:block}
figcaption{font-size:12px;color:#8A857C;margin-top:8px;font-family:Raleway,sans-serif}
.meta{font-family:Raleway,sans-serif;font-size:14px;color:#4a463d}
</style></head><body>
<h1>MyYanga v4 — Visual Architecture</h1>
<p class="meta">Screenshots are <b>embedded</b> in this file (base64 — not external links). Open in any browser. Narrative: <code>MYYANGA_V4_CAPABILITIES.md</code> · Business: <code>MYYANGA_BUSINESS_PLAN.md</code> · Tech: <code>FEATURES_AND_IMPLEMENTATION.md</code></p>
<p class="meta">Prepared ${new Date().toISOString().slice(0, 10)} · ZonicMe Limited · Pre-production handoff</p>
${sections}
</body></html>
`;

writeFileSync(out, html);
console.log("Wrote", out, "(" + Math.round(html.length / 1024) + " KB,", shots.filter(([, f]) => existsSync(join(assets, f))).length, "images)");
