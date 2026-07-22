/**
 * Blog article comments — Testing: localStorage; Production: blog_comments table.
 */
import { supabase, hasSupabase } from "./supabase.js";
import { isProduction } from "./dataBridge.js";

const KEY = "myyanga_blog_comments";

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocal(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export function loadLocalBlogComments(slug) {
  const map = readLocal();
  return Array.isArray(map[slug]) ? map[slug] : [];
}

export function saveLocalBlogComment(slug, comment) {
  const map = readLocal();
  const list = Array.isArray(map[slug]) ? map[slug] : [];
  const row = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    slug,
    body: String(comment.body || "").trim().slice(0, 1000),
    guest_name: comment.guest_name || "Reader",
    user_id: comment.user_id || null,
    created_at: new Date().toISOString(),
  };
  map[slug] = [...list, row];
  writeLocal(map);
  return row;
}

export async function loadBlogComments(slug) {
  if (!slug) return [];
  if (isProduction() && hasSupabase) {
    try {
      const { data, error } = await supabase
        .from("blog_comments")
        .select("id,body,guest_name,created_at,user_id,slug")
        .eq("slug", slug)
        .order("created_at", { ascending: true });
      if (!error && data) return data;
    } catch {
      /* fall through to local */
    }
  }
  return loadLocalBlogComments(slug);
}

export async function postBlogComment(slug, { body, guest_name, user_id }) {
  const trimmed = String(body || "").trim().slice(0, 1000);
  if (!trimmed) throw new Error("Write a comment first");

  const payload = {
    slug,
    body: trimmed,
    guest_name: user_id ? null : (guest_name?.trim() || "Reader"),
    user_id: user_id || null,
  };

  if (isProduction() && hasSupabase) {
    try {
      const { data, error } = await supabase.from("blog_comments").insert(payload).select().single();
      if (!error && data) return data;
    } catch {
      /* fall through */
    }
  }
  return saveLocalBlogComment(slug, payload);
}
