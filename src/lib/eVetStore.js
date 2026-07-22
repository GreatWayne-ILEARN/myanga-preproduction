/**
 * Brand e-vetting dossier (Testing = localStorage; Production = creators columns / migration 010).
 * Cart unlocks only when is_e_vetted after CAC + KYC minimums are satisfied.
 */

import { supabase, hasSupabase } from "./supabase.js";

const LOCAL_VET = "myyanga_e_vet_overrides";
const MODE_KEY = "myyanga_app_mode";

/** Avoid importing dataBridge (circular). */
function inTestingMode() {
  if (!hasSupabase) return true;
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m !== "production" && m !== "live";
  } catch {
    return true;
  }
}

/** Nigeria CAC public search — admin clicks through, then snaps fields back into MyYanga. */
export const CAC_PORTAL_URL = "https://search.cac.gov.ng";

export function emptyVettingDossier() {
  return {
    is_e_vetted: false,
    is_promoted: false,
    cac_rc_number: "",
    legal_name: "",
    registered_address: "",
    main_director: "",
    contact_email: "",
    contact_phone: "",
    social_instagram: "",
    social_whatsapp: "",
    social_other: "",
    tin: "",
    id_shot_note: "",
    id_shot_data_url: "",
    scandals_notes: "",
    scandals_cleared: false,
    cac_verified: false,
    cac_verified_at: null,
    cac_snap_raw: "",
    flutterwave_subaccount_id: "",
    paystack_subaccount_code: "",
    commerce_notes: "",
    vetted_at: null,
  };
}

/** Columns safe to persist to Postgres (no huge data-URLs). */
const DB_FIELDS = [
  "is_e_vetted",
  "is_promoted",
  "cac_rc_number",
  "legal_name",
  "registered_address",
  "main_director",
  "contact_email",
  "contact_phone",
  "social_instagram",
  "social_whatsapp",
  "social_other",
  "tin",
  "id_shot_note",
  "scandals_notes",
  "scandals_cleared",
  "cac_verified",
  "cac_verified_at",
  "cac_snap_raw",
  "flutterwave_subaccount_id",
  "paystack_subaccount_code",
  "commerce_notes",
  "vetted_at",
  "e_vetted_at",
];

export function loadEVetOverrides() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_VET) || "{}");
  } catch {
    return {};
  }
}

export function saveEVetOverrides(map) {
  localStorage.setItem(LOCAL_VET, JSON.stringify(map));
  window.dispatchEvent(new Event("myyanga:evet"));
}

export function applyEVetOverrides(list) {
  const ov = loadEVetOverrides();
  return (list || []).map((c) => {
    const o = ov[c.id];
    if (!o) return c;
    return { ...c, ...o };
  });
}

function dossierForDb(partial) {
  const row = {};
  for (const k of DB_FIELDS) {
    if (partial[k] !== undefined) row[k] = partial[k];
  }
  if (partial.is_e_vetted && !row.e_vetted_at && !row.vetted_at) {
    row.e_vetted_at = new Date().toISOString();
    row.vetted_at = row.e_vetted_at;
  }
  if (partial.is_e_vetted === false) {
    row.e_vetted_at = null;
  }
  return row;
}

/**
 * Persist dossier — Testing: localStorage; Production: creators update (+ local mirror for ID preview).
 */
export async function saveCreatorVetting(creatorId, partial) {
  const id = creatorId;
  const ov = loadEVetOverrides();
  ov[id] = { ...(ov[id] || {}), ...partial };
  saveEVetOverrides(ov);

  if (inTestingMode() || !supabase) {
    return { ok: true, mode: "testing", dossier: ov[id] };
  }

  const row = dossierForDb(partial);
  const { error } = await supabase.from("creators").update(row).eq("id", id);
  if (error) throw new Error(error.message || "Could not save e-vetting to database");
  return { ok: true, mode: "production", dossier: ov[id] };
}

/**
 * Minimum fields before admin may tick E-vetted / unlock cart.
 */
export function vettingMinimumsMet(d) {
  const x = { ...emptyVettingDossier(), ...d };
  return !!(
    x.cac_rc_number?.trim() &&
    x.legal_name?.trim() &&
    x.registered_address?.trim() &&
    x.main_director?.trim() &&
    x.tin?.trim() &&
    (x.id_shot_data_url || x.id_shot_note?.trim()) &&
    x.cac_verified &&
    x.scandals_cleared &&
    (x.contact_email?.trim() || x.contact_phone?.trim())
  );
}

export function vettingGaps(d) {
  const x = { ...emptyVettingDossier(), ...d };
  const gaps = [];
  if (!x.cac_rc_number?.trim()) gaps.push("CAC / RC number");
  if (!x.legal_name?.trim()) gaps.push("Legal business name");
  if (!x.registered_address?.trim()) gaps.push("Registered address");
  if (!x.main_director?.trim()) gaps.push("Main director");
  if (!x.tin?.trim()) gaps.push("TIN");
  if (!x.id_shot_data_url && !x.id_shot_note?.trim()) gaps.push("Director ID shot");
  if (!x.cac_verified) gaps.push("CAC verified tick");
  if (!x.scandals_cleared) gaps.push("Scandals search cleared");
  if (!x.contact_email?.trim() && !x.contact_phone?.trim()) gaps.push("Contact email or phone");
  return gaps;
}

/**
 * Parse a pasted CAC listing block into dossier fields.
 * Accepts lines like "Company Name: …", "RC Number: …", free text, or JSON.
 */
export function snapCacListing(paste, current = {}) {
  const text = String(paste || "").trim();
  const next = { ...emptyVettingDossier(), ...current, cac_snap_raw: text };
  if (!text) return next;

  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object") {
      return {
        ...next,
        legal_name: j.legal_name || j.companyName || j.name || next.legal_name,
        cac_rc_number: j.cac_rc_number || j.rcNumber || j.rc || next.cac_rc_number,
        registered_address: j.registered_address || j.address || next.registered_address,
        main_director: j.main_director || j.director || j.directors?.[0] || next.main_director,
        tin: j.tin || next.tin,
        cac_verified: true,
        cac_verified_at: new Date().toISOString(),
      };
    }
  } catch {
    /* plain text */
  }

  const grab = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };

  const legal =
    grab(/(?:company\s*name|business\s*name|name)\s*[:\-]\s*(.+)/i) ||
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^(rc|tin|address)/i.test(l)) ||
    "";
  const rc = grab(/(?:rc\s*(?:number|no\.?)?|registration\s*(?:number|no\.?)?)\s*[:\-]\s*([A-Z0-9\/\-]+)/i);
  const addr = grab(/(?:address|registered\s*address)\s*[:\-]\s*(.+)/i);
  const dir = grab(/(?:director|main\s*director|proprietor)\s*[:\-]\s*(.+)/i);
  const tin = grab(/(?:tin|tax)\s*[:\-]\s*([A-Z0-9\-]+)/i);

  return {
    ...next,
    legal_name: legal || next.legal_name,
    cac_rc_number: rc || next.cac_rc_number,
    registered_address: addr || next.registered_address,
    main_director: dir || next.main_director,
    tin: tin || next.tin,
    cac_verified: !!(legal || rc || addr),
    cac_verified_at: new Date().toISOString(),
  };
}

export function openCacPortal(rcOrName = "") {
  const q = encodeURIComponent(String(rcOrName || "").trim());
  const url = q ? `${CAC_PORTAL_URL}/?q=${q}` : CAC_PORTAL_URL;
  window.open(url, "_blank", "noopener,noreferrer");
}
