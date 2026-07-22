#!/usr/bin/env node
/**
 * Capture fresh architecture screenshots via Playwright + system Chrome.
 * Serves dist/ locally (no Vite CDN). Run after `npm run build`.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/assets");
mkdirSync(outDir, { recursive: true });

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serveDist(port = 4177) {
  const dist = join(root, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("dist/ missing — run npm run build first");
  }
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = (req.url || "/").split("?")[0];
      if (path === "/") path = "/index.html";
      let file = join(dist, path);
      if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
      try {
        const buf = readFileSync(file);
        res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
        res.end(buf);
      } catch {
        res.writeHead(404);
        res.end("missing");
      }
    });
    server.listen(port, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${port}` }));
  });
}

async function shot(page, name, opts = {}) {
  const file = join(outDir, name);
  await page.screenshot({ path: file, fullPage: !!opts.fullPage });
  console.log("SHOT", name);
  return name;
}

async function main() {
  const { chromium } = await import("playwright").catch(() => ({ chromium: null }));
  if (!chromium) {
    console.error("Playwright not installed");
    process.exit(1);
  }

  const { server, url } = await serveDist();
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const taken = [];

  const goto = async (path) => {
    await page.goto(url + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(700);
  };

  await goto("/");
  taken.push(await shot(page, "myyanga-home.png"));

  await goto("/?view=settings");
  taken.push(await shot(page, "myyanga-settings.png"));

  await goto("/?view=virtualwear");
  taken.push(await shot(page, "myyanga-virtualwear.png"));

  await goto("/?view=reels");
  taken.push(await shot(page, "myyanga-reels.png"));

  await goto("/?view=smart");
  taken.push(await shot(page, "myyanga-smartsearch-results.png"));

  await goto("/?view=discover");
  taken.push(await shot(page, "myyanga-discover.png"));

  await goto("/?view=blog");
  taken.push(await shot(page, "myyanga-blog.png"));

  await goto("/?view=article&slug=lagos-fashion-week-creative-economy");
  taken.push(await shot(page, "myyanga-article.png", { fullPage: true }));

  await goto("/?view=bag");
  taken.push(await shot(page, "myyanga-bag.png"));

  // Settings filled
  try {
    await goto("/?view=settings");
    await page.evaluate(() => {
      localStorage.setItem(
        "myyanga_member_settings",
        JSON.stringify({
          display_name: "Ada Okonkwo",
          email: "ada@example.com",
          phone: "+2348012345678",
          city: "Lagos",
          country: "Nigeria",
          fashion_preference: "female",
          bio: "Owambe & bridal edits",
        }),
      );
      localStorage.setItem(
        "myyanga_reel_prefs",
        JSON.stringify({
          channels: { inapp: true, email: true, webpush: true, whatsapp: false },
          email: "ada@example.com",
          phone: "+2348012345678",
          schedule: {
            frequency: "weekly",
            days: ["fri", "sat"],
            time_local: "18:00",
            timezone_hint: "Africa/Lagos",
            quiet_start: "22:00",
            quiet_end: "07:00",
          },
        }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    taken.push(await shot(page, "myyanga-settings-filled.png", { fullPage: true }));
  } catch (e) {
    console.warn("settings-filled", e.message);
  }

  // Login modal
  try {
    await goto("/");
    await page.evaluate(() => localStorage.removeItem("myyanga_test_session"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const loginBtn = page.getByRole("button", { name: /^Login$/i }).first();
    if (await loginBtn.count()) {
      await loginBtn.click();
      await page.waitForTimeout(500);
      taken.push(await shot(page, "myyanga-login.png"));
      await page.keyboard.press("Escape").catch(() => {});
    }
  } catch (e) {
    console.warn("login", e.message);
  }

  // PDP if catalogue has a garment
  try {
    await goto("/?view=shop");
    await page.waitForTimeout(500);
    const card = page.locator(".card").first();
    if (await card.count()) {
      await card.click();
      await page.waitForTimeout(800);
      taken.push(await shot(page, "myyanga-pdp.png"));
    }
  } catch (e) {
    console.warn("pdp", e.message);
  }

  // Admin + e-vetting as founding owner
  try {
    await goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "myyanga_test_session",
        JSON.stringify({
          id: "founding",
          email: "oadeagbo@gmail.com",
          name: "Olufemi Adeagbo",
          role: "owner",
          is_owner: true,
          privileges: ["brand_e_vetting", "content_studio", "monetization", "analytics"],
        }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await goto("/?view=admin");
    taken.push(await shot(page, "myyanga-admin.png"));

    const evet = page.locator("text=E-vetting").first();
    if (await evet.count()) {
      await evet.click();
      await page.waitForTimeout(700);
      taken.push(await shot(page, "myyanga-evetting.png", { fullPage: true }));
    }

    const access = page.locator("text=Access Control").first();
    if (await access.count()) {
      await access.click();
      await page.waitForTimeout(600);
      taken.push(await shot(page, "myyanga-accesscontrol.png"));
    }

    const mon = page.locator("text=Monetization").first();
    if (await mon.count()) {
      await mon.click();
      await page.waitForTimeout(600);
      taken.push(await shot(page, "myyanga-monetization.png"));
    }
  } catch (e) {
    console.warn("admin", e.message);
  }

  // Mobile smoke (~390) — overwrite home with desktop already saved; save mobile separately
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto("/");
    taken.push(await shot(page, "myyanga-home-mobile.png"));
    await goto("/?view=settings");
    taken.push(await shot(page, "myyanga-settings-mobile.png"));
  } catch (e) {
    console.warn("mobile", e.message);
  }

  await browser.close();
  server.close();
  writeFileSync(join(outDir, "SHOTS_INDEX.txt"), taken.join("\n") + "\n");
  console.log("Done → docs/assets/ (" + taken.length + " shots)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
