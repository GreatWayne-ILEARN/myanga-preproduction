/**
 * Reel preference + inbox + outbound delivery logs (Testing = localStorage).
 * Production can mirror these into user_notifications / notification_data / push_subscriptions.
 */
const KEYS = {
  prefs: "myyanga_reel_prefs",
  inbox: "myyanga_reel_inbox",
  outbound: "myyanga_reel_outbound",
  config: "myyanga_reel_config_override",
  waQueue: "myyanga_wa_queue",
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

export function defaultReelPrefs() {
  return {
    channels: { inapp: true, email: false, webpush: false, whatsapp: false },
    email: "",
    phone: "", // E.164 preferred, e.g. +234…
    pushSubscription: null,
    /** Scheduling for notification reels */
    schedule: {
      frequency: "weekly", // daily | weekly | biweekly
      days: ["fri", "sat"], // lowercase weekday keys
      time_local: "18:00",
      timezone_hint: "Africa/Lagos",
      quiet_start: "22:00",
      quiet_end: "07:00",
    },
  };
}

export function loadReelPrefs() {
  return { ...defaultReelPrefs(), ...read(KEYS.prefs, {}) };
}

export function saveReelPrefs(partial) {
  const cur = loadReelPrefs();
  const next = { ...cur, ...partial };
  if (partial.channels) next.channels = { ...cur.channels, ...partial.channels };
  if (partial.schedule) next.schedule = { ...cur.schedule, ...partial.schedule };
  write(KEYS.prefs, next);
  return next;
}

export function loadReelInbox() {
  return read(KEYS.inbox, []);
}

export function pushReelToInbox(reel) {
  const list = loadReelInbox();
  list.unshift(reel);
  write(KEYS.inbox, list.slice(0, 40));
  return reel;
}

export function markReelRead(id) {
  const list = loadReelInbox().map((r) => (r.id === id ? { ...r, read: true } : r));
  write(KEYS.inbox, list);
}

export function loadOutboundLog() {
  return read(KEYS.outbound, []);
}

export function logOutbound(entry) {
  const list = loadOutboundLog();
  list.unshift({ ...entry, at: new Date().toISOString() });
  write(KEYS.outbound, list.slice(0, 100));
}

export function loadReelConfigOverride() {
  return read(KEYS.config, null);
}

export function saveReelConfigOverride(cfg) {
  write(KEYS.config, cfg);
  return cfg;
}

export function enqueueWhatsApp(job) {
  const q = read(KEYS.waQueue, []);
  q.unshift({ ...job, id: `wa_${Date.now()}`, status: "queued", at: new Date().toISOString() });
  write(KEYS.waQueue, q.slice(0, 50));
  return q[0];
}

export function loadWhatsAppQueue() {
  return read(KEYS.waQueue, []);
}
