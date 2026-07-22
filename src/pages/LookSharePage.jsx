import React, { useEffect, useState } from "react";
import { supabase, hasSupabase } from "../lib/supabase.js";
import { useAuth } from "../hooks.js";
import { loadLocalLook } from "../lib/lookShare.js";

const naira = (n) => "₦" + Number(n || 0).toLocaleString();

export function LookSharePage({ code, onExit }) {
  const { profile } = useAuth();
  const [look, setLook] = useState(null);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [guest, setGuest] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  const load = async () => {
    setErr("");
    const local = loadLocalLook(code);
    if (hasSupabase) {
      const { data: row, error } = await supabase
        .from("looks")
        .select("id,title,scene,total_ngn,image,share_code,created_at,user_id")
        .eq("share_code", code)
        .eq("is_public", true)
        .maybeSingle();
      if (!error && row) {
        setLook(row);
        setLocalOnly(false);
        const { data: cmts } = await supabase
          .from("look_comments")
          .select("id,body,guest_name,created_at,user_id")
          .eq("look_id", row.id)
          .order("created_at", { ascending: true });
        setComments(cmts || []);
        return;
      }
    }
    if (local) {
      setLook(local);
      setComments([]);
      setLocalOnly(true);
      return;
    }
    setLook(null);
    setErr(hasSupabase ? "Look not found or no longer public." : "Look not found on this device.");
  };

  useEffect(() => {
    load();
  }, [code]);

  const postComment = async () => {
    if (!look || !body.trim()) return;
    if (localOnly || !look.id) {
      window.__toast?.("Comments need a Production look — share again after signing in");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const row = {
        look_id: look.id,
        body: body.trim().slice(0, 1000),
        guest_name: profile ? null : guest.trim() || "Friend",
        user_id: profile?.id || null,
      };
      const { error } = await supabase.from("look_comments").insert(row);
      if (error) throw error;
      setBody("");
      await load();
      window.__toast?.("Comment posted");
    } catch (e) {
      setErr(e.message || "Could not post comment");
    } finally {
      setBusy(false);
    }
  };

  const tryVirtualWear = () => {
    window.history.pushState({}, "", "/?view=virtualwear");
    window.dispatchEvent(new PopStateEvent("popstate"));
    onExit?.();
  };

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">
          <a style={{ cursor: "pointer" }} onClick={onExit}>
            Home
          </a>{" "}
          / Shared look
        </div>
        <h1>{look?.title || "Shared look"}</h1>
        <p className="lead">Friends can react and leave comments on this virtual wear look.</p>
      </div>
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="wrap" style={{ maxWidth: 520 }}>
          {err && !look && <p className="muted">{err}</p>}
          {look && (
            <>
              {look.image ? (
                <img src={look.image} alt="" style={{ width: "100%", border: "1px solid var(--line)" }} />
              ) : (
                <div className="img" style={{ background: "var(--maroon)" }}>
                  Look
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12, textTransform: "capitalize" }}>
                  {look.scene} scene{look.designer_name ? ` · ${look.designer_name}` : ""}
                </span>
                <strong>{naira(look.total_ngn)}</strong>
              </div>
              <div className="vw-actions">
                <button type="button" className="btn btn-ghost" onClick={onExit}>
                  Back home
                </button>
                <button type="button" className="btn" onClick={tryVirtualWear}>
                  Try Virtual Wear
                </button>
              </div>
              <div className="panel" style={{ marginTop: 20 }}>
                <h3 className="serif" style={{ marginTop: 0, fontSize: 18 }}>
                  Comments ({comments.length})
                </h3>
                {localOnly && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    This look is saved on this device (Testing). Live friend comments need Production + signed-in share.
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} style={{ borderBottom: "1px dashed var(--line)", padding: "8px 0" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                      {c.guest_name || "Member"} · {new Date(c.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 14 }}>{c.body}</div>
                  </div>
                ))}
                {!comments.length && !localOnly && <p className="muted" style={{ fontSize: 13 }}>Be the first to comment.</p>}
                {!localOnly && (
                  <>
                    {!profile && (
                      <div className="field" style={{ marginTop: 12 }}>
                        <label>Your name</label>
                        <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Ada" />
                      </div>
                    )}
                    <div className="field">
                      <label>Comment</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        style={{ width: "100%", minHeight: 72, padding: 10, border: "1px solid var(--line)", fontFamily: "inherit" }}
                        placeholder="What do you think of this look?"
                      />
                    </div>
                    {err && <p style={{ color: "#b00020", fontSize: 12 }}>{err}</p>}
                    <button type="button" className="btn" disabled={busy || !body.trim()} onClick={postComment}>
                      {busy ? "Posting…" : "Post comment"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export function shareCodeFromPath() {
  const m = window.location.pathname.match(/\/look\/([^/?#]+)/i);
  return m?.[1] || null;
}
