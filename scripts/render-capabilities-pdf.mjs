#!/usr/bin/env node
/**
 * Render docs/MYYANGA_V4_CAPABILITIES.md straight to PDF with pdf-lib.
 * No browser involved — parses the markdown and typesets it page by page.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const md = readFileSync(join(docsDir, "MYYANGA_V4_CAPABILITIES.md"), "utf8");

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

const pdf = await PDFDocument.create();
const fonts = {
  regular: await pdf.embedFont(StandardFonts.Helvetica),
  bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
};

let page = null;
let y = 0;
let pageNum = 0;

function addPage() {
  page = pdf.addPage([PAGE_W, PAGE_H]);
  pageNum++;
  y = PAGE_H - MARGIN_TOP;
  if (pageNum > 1) {
    page.drawText("MyYanga v4 — Platform Capabilities & Technical Architecture", {
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
    p.drawText("Confidential — ZonicMe Limited / MyYanga", {
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

// Strip markdown inline syntax; return segments with bold/italic flags.
function parseInline(text) {
  const segs = [];
  let rest = text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[₦]/g, "NGN ")
    .replace(/[—–]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[→]/g, "->")
    .replace(/[⇄]/g, "<->")
    .replace(/[·•]/g, "-")
    .replace(/[✓]/g, "[ok]")
    .replace(/[^\x20-\x7E]/g, "");
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

// Wrap inline segments into lines of maxWidth at given size.
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
  page.drawRectangle({
    x: MARGIN_X,
    y: y - blockH + 12,
    width: CONTENT_W,
    height: blockH,
    color: TH_BG,
  });
  page.drawRectangle({
    x: MARGIN_X,
    y: y - blockH + 12,
    width: 3,
    height: blockH,
    color: ACCENT,
  });
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

async function drawImage(relPath, caption) {
  const abs = join(docsDir, relPath.replace(/^\.\//, ""));
  if (!existsSync(abs)) {
    paragraph(`[Missing screenshot: ${relPath}]`);
    return;
  }
  const bytes = readFileSync(abs);
  let img;
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

function table(rows) {
  const cols = rows[0].length;
  const widths =
    cols === 2 ? [CONTENT_W * 0.3, CONTENT_W * 0.7] : Array(cols).fill(CONTENT_W / cols);
  const size = 8.5;
  const pad = 5;

  // Header row is drawn bold, so wrap it with bold widths too.
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

// ── Parse the markdown into blocks and render ──
addPage();
const lines = md.split("\n");
let i = 0;
while (i < lines.length) {
  const line = lines[i];

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
    // absorb hanging indented continuation lines
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
  // paragraph: absorb soft-wrapped lines
  let text = line.trim();
  while (
    i + 1 < lines.length &&
    lines[i + 1].trim() !== "" &&
    !/^(#|\||>|[-*]\s|\d+\.\s|---|!\[)/.test(lines[i + 1].trim())
  ) {
    text += " " + lines[i + 1].trim();
    i++;
  }
  paragraph(text);
  i++;
}

footerAll();
const bytes = await pdf.save();
const out = join(root, "docs/MYYANGA_V4_CAPABILITIES.pdf");
writeFileSync(out, bytes);
console.log(`${out} (${(bytes.length / 1024).toFixed(0)} KB, ${pdf.getPageCount()} pages)`);
