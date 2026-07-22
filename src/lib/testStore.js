/**
 * Testing-mode local store.
 * Testers upload garments / studio content here; Production uses Supabase.
 */
import { FOUNDING_OWNER_EMAIL } from "./accessControlConstants.js";

const KEYS = {
  garments: "myyanga_test_garments",
  site: "myyanga_site_content",
  media: "myyanga_test_media",
  session: "myyanga_test_session",
  access: "myyanga_test_access",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadTesterGarments() {
  return read(KEYS.garments, []);
}

export function saveTesterGarments(list) {
  write(KEYS.garments, list);
}

export function upsertTesterGarment(row) {
  const list = loadTesterGarments();
  const id = row.id || Date.now();
  const next = { ...row, id, is_active: true, source: "tester" };
  const i = list.findIndex((g) => g.id === id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  saveTesterGarments(list);
  return next;
}

export function removeTesterGarment(id) {
  saveTesterGarments(loadTesterGarments().filter((g) => g.id !== id));
}

export function loadSiteMedia() {
  return read(KEYS.media, {});
}

export function saveSiteMedia(map) {
  write(KEYS.media, map);
}

export function loadTestSession() {
  return read(KEYS.session, null);
}

export function saveTestSession(profile) {
  if (!profile) {
    try {
      localStorage.removeItem(KEYS.session);
    } catch {}
    return;
  }
  write(KEYS.session, profile);
}

export function defaultAccessState() {
  return {
    foundingClaimed: true,
    owners: [
      {
        id: "founding",
        email: FOUNDING_OWNER_EMAIL,
        name: "Olufemi Adeagbo",
        is_owner: true,
        role: "owner",
      },
    ],
    coOwners: [],
    admins: [
      {
        id: "founding",
        email: FOUNDING_OWNER_EMAIL,
        name: "Olufemi Adeagbo",
        role: "owner",
        is_owner: true,
        privileges: [],
      },
      {
        id: "test-admin",
        email: "tester@myyanga.test",
        name: "Content Tester",
        role: "admin",
        is_owner: false,
        privileges: ["content_studio", "editorial", "garments", "delete_selected"],
      },
    ],
    audit: [
      {
        action: "founding_owner_seeded",
        target_email: FOUNDING_OWNER_EMAIL,
        created_at: new Date().toISOString(),
        detail: { note: "Default super admin" },
      },
    ],
  };
}

export function loadAccessState() {
  const saved = read(KEYS.access, null);
  if (saved) return saved;
  const seed = defaultAccessState();
  saveAccessState(seed);
  return seed;
}

export function saveAccessState(state) {
  write(KEYS.access, state);
}

/** Tester accounts available only in Testing / pre-prod local mode. */
export const TEST_ACCOUNTS = [
  {
    email: FOUNDING_OWNER_EMAIL,
    password: "GoogleAuth",
    name: "Olufemi Adeagbo",
    role: "owner",
    is_owner: true,
    google: true,
  },
  { email: "tester@myyanga.test", password: "Test2026!", name: "Content Tester", role: "admin", is_owner: false },
  { email: "owner@myyanga.test", password: "Owner2026!", name: "Platform Owner", role: "owner", is_owner: true },
  { email: "user@myyanga.test", password: "User2026!", name: "Demo User", role: "user", is_owner: false },
];

/** Full studio privileges granted to sign-ups during the testing phase.
 *  Revoked automatically in Production, where roles come from the database. */
export const TESTING_PHASE_PRIVILEGES = [
  "content_studio",
  "editorial",
  "monetization",
  "analytics",
  "catalog",
  "garments",
  "reel_config",
  "events",
  "delete_selected",
];

const REGISTERED_KEY = "myyanga_test_registered";

function loadRegisteredTesters() {
  return read(REGISTERED_KEY, []);
}

function saveRegisteredTesters(list) {
  write(REGISTERED_KEY, list);
}

/** Sign-up during testing: instant admin with every studio privilege. */
export function registerTester(name, email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) throw new Error("Email and password required");
  const list = loadRegisteredTesters();
  if (
    list.some((a) => a.email === cleanEmail) ||
    TEST_ACCOUNTS.some((a) => a.email.toLowerCase() === cleanEmail)
  ) {
    throw new Error("Account exists — use Login");
  }
  const account = {
    id: `tester-${Date.now()}`,
    email: cleanEmail,
    password,
    name: name || cleanEmail.split("@")[0],
    role: "admin",
    is_owner: false,
    privileges: [...TESTING_PHASE_PRIVILEGES],
    testing_admin: true,
    created_at: new Date().toISOString(),
  };
  list.push(account);
  saveRegisteredTesters(list);

  // Surface in the Access Control directory so grants are visible/adjustable
  const st = loadAccessState();
  if (!st.admins.find((a) => a.email.toLowerCase() === cleanEmail)) {
    st.admins.push({
      id: account.id,
      email: cleanEmail,
      name: account.name,
      role: "admin",
      is_owner: false,
      privileges: [...TESTING_PHASE_PRIVILEGES],
      testing_admin: true,
    });
    st.audit.unshift({
      action: "testing_admin_signup",
      target_email: cleanEmail,
      created_at: new Date().toISOString(),
      detail: { note: "Auto admin during testing phase — revoked in production" },
    });
    saveAccessState(st);
  }

  const { password: _pw, ...profile } = account;
  return profile;
}

export function authenticateTester(email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const acc =
    TEST_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail && a.password === password) ||
    loadRegisteredTesters().find((a) => a.email === cleanEmail && a.password === password);
  if (!acc) throw new Error("Invalid testing credentials");
  const st = loadAccessState();
  const adminRow = st.admins.find((a) => a.email.toLowerCase() === acc.email.toLowerCase());
  const isCo = st.coOwners.some((c) => c.email.toLowerCase() === acc.email.toLowerCase());
  const ownerRow = st.owners.find((o) => o.email.toLowerCase() === acc.email.toLowerCase() && o.is_owner);
  return {
    id: acc.is_owner || ownerRow ? "founding" : acc.id || `test-${acc.role}`,
    email: acc.email,
    name: acc.name,
    role: ownerRow || acc.is_owner ? "owner" : isCo ? "admin" : acc.role,
    is_owner: !!(ownerRow || acc.is_owner),
    is_co_owner: isCo,
    testing_admin: !!acc.testing_admin,
    privileges:
      adminRow?.privileges ||
      acc.privileges ||
      (acc.role === "admin" ? [...TESTING_PHASE_PRIVILEGES] : []),
  };
}

export function authenticateGoogleTester(email = FOUNDING_OWNER_EMAIL) {
  const target = String(email || FOUNDING_OWNER_EMAIL).toLowerCase();
  if (target !== FOUNDING_OWNER_EMAIL.toLowerCase() && !TEST_ACCOUNTS.some((a) => a.email.toLowerCase() === target)) {
    // Testing phase: any Google email also gets full studio admin rights.
    return {
      id: `google-${Date.now()}`,
      email: target,
      name: target.split("@")[0],
      role: "admin",
      is_owner: false,
      is_co_owner: false,
      testing_admin: true,
      privileges: [...TESTING_PHASE_PRIVILEGES],
      auth_provider: "google",
    };
  }
  const st = loadAccessState();
  const adminRow = st.admins.find((a) => a.email.toLowerCase() === FOUNDING_OWNER_EMAIL.toLowerCase());
  return {
    id: "founding",
    email: FOUNDING_OWNER_EMAIL,
    name: "Olufemi Adeagbo",
    role: "owner",
    is_owner: true,
    is_co_owner: false,
    privileges: adminRow?.privileges || [],
    auth_provider: "google",
  };
}
