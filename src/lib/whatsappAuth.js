/**
 * WhatsApp secondary auth (no BSP).
 * Testing: local OTP (shown once). Production: auth-whatsapp edge → Cloud API OTP + session.
 */
import { hasSupabase, supabase } from "./supabase.js";
import { isProduction, isTesting } from "./dataBridge.js";

const OTP_KEY = "myyanga_wa_otp";
const WA_USERS_KEY = "myyanga_wa_users";

export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return `+${digits.slice(1).replace(/\D/g, "")}`;
  const only = digits.replace(/\D/g, "");
  // Assume NG if 10–11 digits starting with 0 or 7/8/9
  if (only.length === 11 && only.startsWith("0")) return `+234${only.slice(1)}`;
  if (only.length === 10 && /^[789]/.test(only)) return `+234${only}`;
  if (only.length >= 10) return `+${only}`;
  return "";
}

export function waSyntheticEmail(phone) {
  const d = normalizePhone(phone).replace(/\D/g, "");
  return `wa_${d}@auth.myyanga.app`;
}

function readOtpStore() {
  try {
    return JSON.parse(sessionStorage.getItem(OTP_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeOtpStore(o) {
  sessionStorage.setItem(OTP_KEY, JSON.stringify(o));
}

function loadWaUsers() {
  try {
    return JSON.parse(localStorage.getItem(WA_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWaUsers(list) {
  localStorage.setItem(WA_USERS_KEY, JSON.stringify(list));
}

/** Request OTP. Testing returns the code for the UI. */
export async function requestWhatsAppOtp(phone) {
  const e164 = normalizePhone(phone);
  if (!e164 || e164.replace(/\D/g, "").length < 10) {
    throw new Error("Enter a valid WhatsApp number with country code (e.g. +234…)");
  }

  if (isTesting() || !isProduction() || !hasSupabase) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    writeOtpStore({
      phone: e164,
      code,
      expires: Date.now() + 10 * 60 * 1000,
    });
    return { ok: true, testing: true, phone: e164, code, hint: "Testing OTP (not sent on WhatsApp)" };
  }

  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/auth-whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "request", phone: e164 }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Could not send WhatsApp code");
  return { ok: true, phone: e164, ...d };
}

/** Verify OTP → profile (testing) or Supabase session (production). */
export async function verifyWhatsAppOtp(phone, code) {
  const e164 = normalizePhone(phone);
  const cleanCode = String(code || "").trim();
  if (!e164 || !cleanCode) throw new Error("Phone and code required");

  if (isTesting() || !isProduction() || !hasSupabase) {
    const store = readOtpStore();
    if (store.phone !== e164 || store.code !== cleanCode) {
      throw new Error("Invalid or expired code");
    }
    if (Date.now() > (store.expires || 0)) throw new Error("Code expired — request a new one");
    writeOtpStore({});
    return { testing: true, profile: upsertWhatsAppTester(e164) };
  }

  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/auth-whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "verify", phone: e164, code: cleanCode }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Verification failed");

  const email = d.email || waSyntheticEmail(e164);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: d.token_hash,
    type: "email",
  });
  if (error) throw error;
  return { ok: true, email, phone: e164 };
}

export function upsertWhatsAppTester(phone) {
  const e164 = normalizePhone(phone);
  const email = waSyntheticEmail(e164);
  const list = loadWaUsers();
  let row = list.find((u) => u.phone === e164);
  if (!row) {
    row = {
      id: `wa-${Date.now()}`,
      phone: e164,
      email,
      name: `WA ${e164.slice(-4)}`,
      role: "user",
      is_owner: false,
      privileges: [],
      auth_provider: "whatsapp",
      created_at: new Date().toISOString(),
    };
    list.push(row);
    saveWaUsers(list);
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    is_owner: false,
    privileges: [],
    auth_provider: "whatsapp",
  };
}
