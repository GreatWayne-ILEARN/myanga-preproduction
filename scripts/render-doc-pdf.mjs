#!/usr/bin/env node
/**
 * Render any docs/*.md file to PDF with pdf-lib.
 * Usage: node scripts/render-doc-pdf.mjs <input.md> <output.pdf> [headerTitle]
 *
 * Supports: headings, paragraphs, tables, bullets, blockquotes, fenced code,
 * embedded images (docs/assets/ or relative to docs/), maroon accent styling.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node scripts/render-doc-pdf.mjs <input.md> <output.pdf> [headerTitle]");
  process.exit(1);
}

const inputPath = resolve(root, args[0]);
const outputPath = resolve(root, args[1]);
const headerTitle = args[2] || "MyYanga v4";
const footerLeft = args[3] || "Confidential — ZonicMe Limited / MyYanga";

if (!existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  process.exit(1);
}

const md = readFileSync(inputPath, "utf8");

// ── Page geometry (A4) ──
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const INK = rgb(0.11, 0.1, 0.09);
const MUTED = rgb(0.34, 0.33, 0.31);
const ACCENT = rgb(0.42, 0.11, 0.14); // MyYanga maroon
const RULE = rgb(0.906, 0.898, 0.894);
const TH_BG = rgb(0.976, 0.965, 0.945); // cream
const CODE_BG = rgb(0.965, 0.958, 0.945);

const pdf = await PDFDocument.create();
const fonts = {
  regular: await pdf.embedFont(StandardFonts.Helvetica),
  bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  mono: await pdf.embedFont(StandardFonts.Courier),
};

let page = null;
let y = 0;
let pageNum = 0;

function addPage() {
  page = pdf.addPage([PAGE_W, PAGE_H]);
  pageNum++;
  y = PAGE_H - MARGIN_TOP;
  if (pageNum > 1) {
    page.drawText(headerTitle, {
      x: MARGIN_X,
      y: PAGE_H - 34,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
    page.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 42 },
      end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 42 },
      thickness: 0.5,
      color: RULE,
    });
    y = PAGE_H - 58;
  }
}

function footerAll() {
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: PAGE_W - MARGIN_X - 60,
      y: 36,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
    p.drawText(footerLeft, {
      x: MARGIN_X,
      y: 36,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
  });
}

function ensure(height) {
  if (y - height < MARGIN_BOTTOM) addPage();
}

function sanitize(text) {
  return text
    .replace(/[₦]/g, "NGN ")
    .replace(/[—–]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[→]/g, "->")
    .replace(/[⇄]/g, "<->")
    .replace(/[·•]/g, "-")
    .replace(/[✦✓]/g, "*")
    .replace(/[^\x20-\x7E]/g, "");
}

function parseInline(text) {
  const segs = [];
  let rest = sanitize(
    text.replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"),
  );
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) {
      segs.push({ text: rest, bold: false, italic: false });
      break;
    }
    if (m.index > 0) segs.push({ text: rest.slice(0, m.index), bold: false, italic: false });
    if (m[2] !== undefined) segs.push({ text: m[2], bold: true, italic: false });
    else segs.push({ text: m[3], bold: false, italic: true });
    rest = rest.slice(m.index + m[0].length);
  }
  return segs;
}

function segFont(seg) {
  return seg.bold ? fonts.bold : seg.italic ? fonts.italic : fonts.regular;
}

function wrapSegments(segs, size, maxWidth) {
  const lines = [];
  let line = [];
  let lineW = 0;
  for (const seg of segs) {
    const font = segFont(seg);
    for (const word of seg.text.split(/(\s+)/)) {
      if (!word) continue;
      const w = font.widthOfTextAtSize(word, size);
      if (lineW + w > maxWidth && line.length && word.trim()) {
        lines.push(line);
        line = [];
        lineW = 0;
        if (!word.trim()) continue;
      }
      line.push({ ...seg, text: word, w });
      lineW += w;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawRich(segs, size, x, maxWidth, lineGap, color = INK) {
  const lines = wrapSegments(segs, size, maxWidth);
  for (const ln of lines) {
    ensure(size + lineGap);
    let cx = x;
    for (const part of ln) {
      page.drawText(part.text, { x: cx, y, size, font: segFont(part), color });
      cx += part.w;
    }
    y -= size + lineGap;
  }
}

function heading(text, level) {
  const size = level === 1 ? 20 : level === 2 ? 14 : 11.5;
  const segs = parseInline(text);
  ensure(size + 26);
  y -= level === 1 ? 4 : 14;
  drawRich(segs, size, MARGIN_X, CONTENT_W, 4, level <= 2 ? ACCENT : INK);
  if (level <= 2) {
    ensure(8);
    page.drawLine({
      start: { x: MARGIN_X, y: y + 4 },
      end: { x: PAGE_W - MARGIN_X, y: y + 4 },
      thickness: level === 1 ? 2 : 0.75,
      color: level === 1 ? ACCENT : RULE,
    });
    y -= 8;
  } else {
    y -= 2;
  }
}

function paragraph(text) {
  drawRich(parseInline(text), 9.5, MARGIN_X, CONTENT_W, 3.5);
  y -= 4;
}

function bullet(text, depth) {
  const indent = MARGIN_X + 14 + depth * 14;
  ensure(14);
  page.drawCircle({ x: indent - 8, y: y + 3.2, size: 1.4, color: ACCENT });
  drawRich(parseInline(text), 9.5, indent, CONTENT_W - (indent - MARGIN_X), 3.5);
  y -= 2;
}

function quote(text) {
  const segs = parseInline(text);
  const lines = wrapSegments(segs, 10.5, CONTENT_W - 40);
  const blockH = lines.length * 15 + 20;
  ensure(blockH);
  page.drawRectangle({ x: MARGIN_X, y: y - blockH + 12, width: CONTENT_W, height: blockH, color: TH_BG });
  page.drawRectangle({ x: MARGIN_X, y: y - blockH + 12, width: 3, height: blockH, color: ACCENT });
  y -= 14;
  for (const ln of lines) {
    let cx = MARGIN_X + 20;
    for (const part of ln) {
      page.drawText(part.text, {
        x: cx,
        y,
        size: 10.5,
        font: part.bold ? fonts.bold : fonts.italic,
        color: INK,
      });
      cx += part.w;
    }
    y -= 15;
  }
  y -= 8;
}

function codeBlock(rawLines) {
  const size = 7;
  const lh = size + 2.6;
  const pad = 10;
  const lines = rawLines.map((l) => sanitize(l).replace(/\t/g, "  "));
  const blockH = lines.length * lh + pad * 2;
  ensure(Math.min(blockH, PAGE_H - MARGIN_TOP - MARGIN_BOTTOM));
  page.drawRectangle({
    x: MARGIN_X,
    y: y - blockH + size + 2,
    width: CONTENT_W,
    height: blockH,
    color: CODE_BG,
    borderColor: RULE,
    borderWidth: 0.6,
  });
  y -= pad;
  for (const ln of lines) {
    if (y < MARGIN_BOTTOM + lh) addPage();
    page.drawText(ln.slice(0, 110), { x: MARGIN_X + pad, y, size, font: fonts.mono, color: INK });
    y -= lh;
  }
  y -= pad;
}

const imageCache = new Map();
async function drawImage(relPath, caption) {
  const abs = join(docsDir, relPath.replace(/^\.\//, ""));
  if (!existsSync(abs)) {
    paragraph(`[Missing screenshot: ${relPath}]`);
    return;
  }
  let img = imageCache.get(abs);
  if (!img) {
    const bytes = readFileSync(abs);
    try {
      img = await pdf.embedPng(bytes);
    } catch {
      try {
        img = await pdf.embedJpg(bytes);
      } catch {
        paragraph(`[Unreadable image: ${relPath}]`);
        return;
      }
    }
    imageCache.set(abs, img);
  }
  const maxW = CONTENT_W;
  const maxH = 280;
  let w = img.width;
  let h = img.height;
  const scale = Math.min(maxW / w, maxH / h, 1);
  w *= scale;
  h *= scale;
  ensure(h + (caption ? 22 : 10));
  page.drawImage(img, {
    x: MARGIN_X + (CONTENT_W - w) / 2,
    y: y - h,
    width: w,
    height: h,
  });
  y -= h + 4;
  if (caption) {
    drawRich(parseInline(caption), 8, MARGIN_X, CONTENT_W, 3, MUTED);
  }
  y -= 8;
}

function colWidths(cols) {
  if (cols === 2) return [CONTENT_W * 0.3, CONTENT_W * 0.7];
  if (cols === 3) return [CONTENT_W * 0.24, CONTENT_W * 0.38, CONTENT_W * 0.38];
  if (cols === 4) return [CONTENT_W * 0.18, CONTENT_W * 0.26, CONTENT_W * 0.28, CONTENT_W * 0.28];
  if (cols === 5) return [CONTENT_W * 0.26, CONTENT_W * 0.32, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.14];
  return Array(cols).fill(CONTENT_W / cols);
}

function table(rows) {
  const cols = rows[0].length;
  const widths = colWidths(cols);
  const size = 8.5;
  const pad = 5;

  const cellLines = rows.map((row, r) =>
    row.map((cell, c) =>
      wrapSegments(
        parseInline(cell).map((s) => (r === 0 ? { ...s, bold: true } : s)),
        size,
        widths[c] - pad * 2,
      ),
    ),
  );
  const rowHeights = cellLines.map(
    (row) => Math.max(...row.map((l) => Math.max(l.length, 1))) * (size + 3) + pad * 2,
  );

  rows.forEach((row, r) => {
    const h = rowHeights[r];
    ensure(h + 2);
    let x = MARGIN_X;
    row.forEach((_, c) => {
      page.drawRectangle({
        x,
        y: y - h + size + pad - 2,
        width: widths[c],
        height: h,
        borderColor: RULE,
        borderWidth: 0.6,
        color: r === 0 ? TH_BG : undefined,
      });
      let ty = y;
      for (const ln of cellLines[r][c]) {
        let cx = x + pad;
        for (const part of ln) {
          page.drawText(part.text, {
            x: cx,
            y: ty,
            size,
            font: r === 0 ? fonts.bold : segFont(part),
            color: r === 0 ? ACCENT : INK,
          });
          cx += part.w;
        }
        ty -= size + 3;
      }
      x += widths[c];
    });
    y -= h;
  });
  y -= 8;
}

addPage();
const lines = md.split("\n");
let i = 0;
while (i < lines.length) {
  const line = lines[i];

  if (/^```/.test(line)) {
    const buf = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    i++;
    codeBlock(buf);
    continue;
  }
  if (/^---\s*$/.test(line)) {
    i++;
    continue;
  }
  const h = line.match(/^(#{1,3})\s+(.*)/);
  if (h) {
    heading(h[2], h[1].length);
    i++;
    continue;
  }
  const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
  if (img) {
    await drawImage(img[2].trim(), img[1].trim());
    i++;
    continue;
  }
  if (/^\|/.test(line)) {
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) {
      const cells = lines[i]
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      if (!cells.every((c) => /^-{2,}$/.test(c))) rows.push(cells);
      i++;
    }
    if (rows.length) table(rows);
    continue;
  }
  if (/^>\s?/.test(line)) {
    let text = "";
    while (i < lines.length && /^>\s?/.test(lines[i])) {
      text += lines[i].replace(/^>\s?/, "") + " ";
      i++;
    }
    quote(text.trim());
    continue;
  }
  const b = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)/);
  if (b) {
    const depth = Math.floor(b[1].length / 2);
    let text = b[3];
    while (i + 1 < lines.length && /^\s{2,}[^-*\s]/.test(lines[i + 1])) {
      text += " " + lines[i + 1].trim();
      i++;
    }
    bullet(text, depth);
    i++;
    continue;
  }
  if (line.trim() === "") {
    i++;
    continue;
  }
  let text = line.trim();
  while (
    i + 1 < lines.length &&
    lines[i + 1].trim() !== "" &&
    !/^(#|\||>|[-*]\s|\d+\.\s|---|!\[|```)/.test(lines[i + 1].trim())
  ) {
    text += " " + lines[i + 1].trim();
    i++;
  }
  paragraph(text);
  i++;
}

footerAll();
const bytes = await pdf.save();
writeFileSync(outputPath, bytes);
console.log(`${outputPath} (${(bytes.length / 1024).toFixed(0)} KB, ${pdf.getPageCount()} pages)`);
