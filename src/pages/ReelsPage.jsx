import React, { useEffect, useState } from "react";
import {
  loadReelPrefs,
  saveReelPrefs,
  loadReelInbox,
  markReelRead,
  loadOutboundLog,
  loadWhatsAppQueue,
} from "../lib/reelStore.js";
import { sendReelNow, subscribeWebPush, registerReelServiceWorker } from "../lib/reelEngine.js";

const naira = (n) => "₦" + Number(n || 0).toLocaleString();

export function ReelsPage({ go, highlightId }) {
  const [prefs, setPrefs] = useState(() => loadReelPrefs());
  const [inbox, setInbox] = useState(() => loadReelInbox());
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    setPrefs(loadReelPrefs());
    setInbox(loadReelInbox());
  };

  useEffect(() => {
    registerReelServiceWorker();
    refresh();
  }, []);

  useEffect(() => {
    if (highlightId) {
      const hit = loadReelInbox().find((r) => r.id === highlightId);
      if (hit) {
        setActive(hit);
        markReelRead(hit.id);
        refresh();
      }
    }
  }, [highlightId]);

  const setChannel = (k, on) => {
    const next = saveReelPrefs({ channels: { ...prefs.channels, [k]: on } });
    setPrefs(next);
  };

  const saveContact = () => {
    saveReelPrefs({ email: prefs.email, phone: prefs.phone });
    window.__toast?.("Delivery preferences saved");
    refresh();
  };

  const enablePush = async () => {
    setBusy(true);
    try {
      await subscribeWebPush();
      window.__toast?.("Push enabled — you'll get a banner when a reel lands");
      refresh();
    } catch (e) {
      window.__toast?.(e.message || "Could not enable push");
    } finally {
      setBusy(false);
    }
  };

  const requestMine = async () => {
    setBusy(true);
    try {
      const { reel, results } = await sendReelNow({ title: "Your MyYanga reel" });
      setActive(reel);
      refresh();
      const ok = results.filter((r) => r.ok).map((r) => r.channel).join(", ");
      window.__toast?.(`Reel delivered via: ${ok || "none"}`);
    } catch (e) {
      window.__toast?.(e.message || "Could not build reel");
    } finally {
      setBusy(false);
    }
  };

  const openReel = (r) => {
    setActive(r);
    markReelRead(r.id);
    refresh();
  };

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">Home / Reels</div>
        <h1>My Reels</h1>
        <p className="lead">
          Fashion image reels land here first (in-app). Turn on email, web push, or WhatsApp below — or manage your full
          profile and schedule in{" "}
          <a style={{ cursor: "pointer", color: "var(--maroon)", fontWeight: 700 }} onClick={() => go?.("settings")}>
            Settings
          </a>
          .
        </p>
      </div>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="tick-label">Delivery channels</div>
            <div className="tick-grid" style={{ marginBottom: 14 }}>
              {[
                ["inapp", "In-app inbox"],
                ["email", "Email"],
                ["webpush", "Web push"],
                ["whatsapp", "WhatsApp"],
              ].map(([id, label]) => (
                <label key={id} className={"tick-box" + (prefs.channels?.[id] ? " on" : "")}>
                  <input
                    type="checkbox"
                    checked={!!prefs.channels?.[id]}
                    onChange={(e) => setChannel(id, e.target.checked)}
                  />
                  <span className="tick-mark">{prefs.channels?.[id] ? "✓" : ""}</span>
                  <span className="tick-text">{label}</span>
                </label>
              ))}
            </div>
            <div className="grid g2">
              <div className="field">
                <label>Email for reels</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={prefs.email || ""}
                  onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label>WhatsApp number (E.164)</label>
                <input
                  type="tel"
                  placeholder="+2348012345678"
                  value={prefs.phone || ""}
                  onChange={(e) => setPrefs({ ...prefs, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="action-row">
              <button type="button" className="btn" onClick={saveContact}>
                Save preferences
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={enablePush}>
                Enable browser push
              </button>
              <button type="button" className="btn btn-gold" disabled={busy} onClick={requestMine}>
                {busy ? "Building…" : "Send me a reel now"}
              </button>
            </div>
          </div>

          <div className="grid g2" style={{ alignItems: "start" }}>
            <div>
              <div className="vw-section-h">Inbox ({inbox.length})</div>
              {!inbox.length && <p className="muted">No reels yet — tap “Send me a reel now”.</p>}
              <div className="del-rows">
                {inbox.map((r) => (
                  <div
                    className="del-row"
                    key={r.id}
                    style={{ cursor: "pointer", background: active?.id === r.id ? "rgba(133,7,19,.06)" : undefined }}
                    onClick={() => openReel(r)}
                  >
                    <span>
                      {!r.read && <b style={{ color: "var(--maroon)" }}>● </b>}
                      {r.title}
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {r.panes?.length || 0} panes
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {active ? (
                <div className="look">
                  <div className="head">
                    <span style={{ fontWeight: 800 }}>{active.title}</span>
                    <span style={{ fontSize: 11 }}>{active.panes?.length} panes</span>
                  </div>
                  <div className="items">
                    {active.panes?.map((p, i) => (
                      <div className="it" key={`${p.kind}-${p.id}-${i}`} style={{ alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
                          {p.image && (
                            <img
                              src={p.image}
                              alt=""
                              style={{ width: 44, height: 58, objectFit: "cover", flexShrink: 0 }}
                            />
                          )}
                          <span style={{ minWidth: 0 }}>
                            <b>{p.title}</b>
                            <br />
                            <span className="muted">
                              {p.subtitle}
                              {p.kind === "brand" ? " · Sponsored" : ""}
                            </span>
                          </span>
                        </div>
                        <span>
                          {p.price_ngn ? naira(p.price_ngn) : ""}
                          {p.cta === "virtualwear" && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: "6px 10px", fontSize: 10, marginLeft: 8 }}
                              onClick={() => go?.("virtualwear")}
                            >
                              Try on
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="muted">Select a reel to view panes.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Admin diagnostics strip for outbound + WA queue */
export function ReelDeliveryDiagnostics() {
  const [out, setOut] = useState(() => loadOutboundLog());
  const [wa, setWa] = useState(() => loadWhatsAppQueue());
  return (
    <div style={{ marginTop: 24 }}>
      <h3 className="serif">Delivery log (last sends)</h3>
      <div className="del-rows">
        {out.slice(0, 12).map((e, i) => (
          <div className="del-row" key={i}>
            <span>
              <b>{e.channel}</b> · {e.status}
            </span>
            <span className="muted" style={{ fontSize: 11 }}>
              {e.detail}
            </span>
          </div>
        ))}
        {!out.length && <p className="muted">No outbound yet.</p>}
      </div>
      <h3 className="serif" style={{ marginTop: 18 }}>
        WhatsApp queue
      </h3>
      <div className="del-rows">
        {wa.slice(0, 8).map((j) => (
          <div className="del-row" key={j.id}>
            <span>
              {j.phone} · {j.title}
            </span>
            <a className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 10 }} href={j.waMe} target="_blank" rel="noreferrer">
              Open wa.me
            </a>
          </div>
        ))}
        {!wa.length && <p className="muted">Queue empty — enable WhatsApp on Reels prefs and send a reel.</p>}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: 10 }}
        onClick={() => {
          setOut(loadOutboundLog());
          setWa(loadWhatsAppQueue());
        }}
      >
        Refresh logs
      </button>
    </div>
  );
}
