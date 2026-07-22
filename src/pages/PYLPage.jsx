import React, { useState } from "react";
import { PayGate } from "../components/PayGate.jsx";
import { Data, isProduction } from "../lib/dataBridge.js";
import { supabase, hasSupabase } from "../lib/supabase.js";
import { useAuth } from "../hooks.js";
import { Pager, usePaged } from "../components/Pager.jsx";
import { usePerPage } from "../hooks/usePerPage.js";

function Img({ entry }) {
  if (entry.image) return <img src={entry.image} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover" }} />;
  const img = entry.img || { c1: "#850713", c2: "#4a040a", t: "★" };
  return (
    <div className="img" style={{ background: `linear-gradient(135deg,${img.c1},${img.c2})` }}>
      {img.t}
    </div>
  );
}

function PYLInner() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState(null);
  const [caption, setCaption] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const paged = usePaged(entries || [], usePerPage("pyl"));

  const reload = async () => {
    const rows = await Data.pyl();
    setEntries(rows);
  };

  React.useEffect(() => {
    reload();
  }, []);

  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setPhoto(ev.target.result);
    r.readAsDataURL(f);
  };

  const post = async () => {
    if (!photo) return window.__toast?.("Add a photo first");
    if (!profile && hasSupabase && isProduction()) return window.__toast?.("Sign in to post");
    setBusy(true);
    try {
      if (hasSupabase && isProduction()) {
        const { error } = await supabase.from("pyl_entries").insert({
          user_id: profile.id,
          image: photo,
          caption: caption.trim() || null,
          status: "live",
        });
        if (error) throw error;
      } else {
        setEntries((s) => [
          { id: Date.now(), user: profile?.name || "You", votes: 0, image: photo, caption },
          ...(s || []),
        ]);
      }
      setCaption("");
      setPhoto(null);
      window.__toast?.("Look posted — good luck!");
      if (hasSupabase && isProduction()) await reload();
    } catch (e) {
      window.__toast?.(e.message || "Post failed");
    } finally {
      setBusy(false);
    }
  };

  const vote = async (id) => {
    if (!profile && hasSupabase && isProduction()) return window.__toast?.("Sign in to vote");
    try {
      if (hasSupabase && isProduction()) {
        const { data, error } = await supabase.rpc("vote_pyl", { p_entry: id });
        if (error) throw error;
        setEntries((rows) => rows.map((e) => (e.id === id ? { ...e, votes: data } : e)));
        window.__toast?.("Vote counted");
      } else {
        setEntries((rows) => rows.map((e) => (e.id === id ? { ...e, votes: (e.votes || 0) + 1 } : e)));
      }
    } catch (e) {
      window.__toast?.(e.message || "Already voted");
    }
  };

  if (!entries) return <p className="muted wrap">Loading entries…</p>;

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">Home / Post Your Look</div>
        <h1>Post Your Look</h1>
        <p className="lead">Show your style, collect votes, and compete for picture · bride · look of the day.</p>
      </div>
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="wrap">
          <div className="panel" style={{ maxWidth: 480, marginBottom: 28 }}>
            <h3 className="serif" style={{ marginTop: 0 }}>Enter the competition</h3>
            <label className="drop" style={{ display: "block" }}>
              {photo ? <img src={photo} alt="" style={{ maxHeight: 200 }} /> : "Upload your look photo"}
              <input type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
            </label>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Caption (optional)</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Owambe ready in coral Aso-Oke" />
            </div>
            <button className="btn" disabled={busy || !photo} onClick={post}>
              {busy ? "Posting…" : "Post your look"}
            </button>
          </div>
          <div className="grid g4">
            {(paged.slice).map((e) => (
              <div className="card" key={e.id}>
                <Img entry={e} />
                <div className="meta">
                  <div className="t">@{e.user}</div>
                  {e.caption && <div className="b">{e.caption}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span className="b">❤ {e.votes || 0} votes</span>
                    <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 10 }} onClick={() => vote(e.id)}>
                      Vote
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pager page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} />
          {paged.totalPages > 1 && (
            <p className="pager-meta">
              Showing {(paged.page - 1) * paged.perPage + 1}–{Math.min(paged.page * paged.perPage, paged.total)} of{" "}
              {paged.total} looks
            </p>
          )}
        </div>
      </section>
    </>
  );
}

export function PYLPage() {
  return (
    <PayGate feature="pyl_entry">
      <PYLInner />
    </PayGate>
  );
}
