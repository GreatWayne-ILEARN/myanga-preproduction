/** Local shared looks — Testing + offline fallback when Supabase looks table is unavailable. */
const KEY = "myyanga_local_looks";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
}

export function saveLocalLook(look) {
  const list = read().filter((l) => l.share_code !== look.share_code);
  list.unshift({ ...look, created_at: look.created_at || new Date().toISOString(), is_public: true });
  write(list);
  return look;
}

export function loadLocalLook(code) {
  return read().find((l) => l.share_code === code) || null;
}

export function lookShareUrl(code) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/look/${encodeURIComponent(code)}`;
}

/** Navigate SPA to /look/:code and notify App via popstate. */
export function openLookInApp(code) {
  if (typeof window === "undefined" || !code) return;
  window.history.pushState({}, "", `/look/${encodeURIComponent(code)}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}
