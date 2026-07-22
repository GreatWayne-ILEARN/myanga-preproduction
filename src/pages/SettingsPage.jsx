import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks.js";
import { loadMemberSettings, saveMemberSettings } from "../lib/memberSettings.js";
import { loadReelPrefs, saveReelPrefs } from "../lib/reelStore.js";
import { subscribeWebPush, registerReelServiceWorker } from "../lib/reelEngine.js";
import { track, EV } from "../lib/analytics.js";

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

/**
 * Sleek member Settings — identity + reel notification schedule.
 */
export function SettingsPage({ go }) {
  const { profile } = useAuth();
  const [me, setMe] = useState(() => loadMemberSettings());
  const [prefs, setPrefs] = useState(() => loadReelPrefs());
  const [savedFlash, setSavedFlash] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerReelServiceWorker();
    const local = loadMemberSettings();
    if (profile && (!local.email || !local.display_name)) {
      const seeded = saveMemberSettings({
        display_name: local.display_name || profile.name || "",
        email: local.email || profile.email || "",
        phone: local.phone || profile.phone || "",
      });
      setMe(seeded);
    }
  }, [profile]);

  const flash = (msg) => {
    setSavedFlash(msg);
    window.__toast?.(msg);
    setTimeout(() => setSavedFlash(""), 2200);
  };

  const saveProfile = () => {
    const next = saveMemberSettings(me);
    setMe(next);
    // Keep reel delivery contacts in sync when member fills Settings
    if (me.email || me.phone) {
      setPrefs(saveReelPrefs({ email: me.email || prefs.email, phone: me.phone || prefs.phone }));
    }
    track(EV.UI_CLICK, { label: "settings_save_profile" });
    flash("Profile saved");
  };

  const saveSchedule = () => {
    const next = saveReelPrefs({
      channels: prefs.channels,
      email: me.email || prefs.email,
      phone: me.phone || prefs.phone,
      schedule: prefs.schedule,
    });
    setPrefs(next);
    track(EV.REEL_CHANNEL, {
      inapp: !!next.channels.inapp,
      email: !!next.channels.email,
      webpush: !!next.channels.webpush,
      whatsapp: !!next.channels.whatsapp,
      frequency: next.schedule?.frequency,
    });
    flash("Reel schedule saved");
  };

  const toggleDay = (id) => {
    const days = prefs.schedule?.days || [];
    const next = days.includes(id) ? days.filter((d) => d !== id) : [...days, id];
    setPrefs({ ...prefs, schedule: { ...prefs.schedule, days: next } });
  };

  const setChannel = (k, on) => {
    setPrefs({ ...prefs, channels: { ...prefs.channels, [k]: on } });
  };

  const enablePush = async () => {
    setBusy(true);
    try {
      await subscribeWebPush();
      setPrefs(loadReelPrefs());
      setChannel("webpush", true);
      flash("Browser push enabled");
    } catch (e) {
      flash(e.message || "Push unavailable");
    } finally {
      setBusy(false);
    }
  };

  const sched = prefs.schedule || {};

  return (
    <>
      <div className="settings-hero">
        <div className="wrap">
          <div className="crumbs" style={{ color: "rgba(240,217,184,.7)" }}>
            Home / Settings
          </div>
          <h1 className="settings-title">Your MyYanga</h1>
          <p className="settings-lead">
            Identity, delivery contacts, and when fashion reels should find you — calm controls, no clutter.
          </p>
          {savedFlash && <div className="settings-flash">{savedFlash}</div>}
        </div>
      </div>

      <section className="section settings-body">
        <div className="wrap settings-grid">
          {/* Profile */}
          <article className="settings-card">
            <header className="settings-card-h">
              <span className="settings-kicker">Profile</span>
              <h2>About you</h2>
              <p>Used across Virtual Wear shares and delivery — never sold as raw PII in analytics.</p>
            </header>
            <div className="settings-fields">
              <label className="settings-field">
                <span>Display name</span>
                <input
                  value={me.display_name}
                  onChange={(e) => setMe({ ...me, display_name: e.target.value })}
                  placeholder="Ada Okonkwo"
                />
              </label>
              <label className="settings-field">
                <span>Email</span>
                <input
                  type="email"
                  value={me.email}
                  onChange={(e) => setMe({ ...me, email: e.target.value })}
                  placeholder="you@email.com"
                />
              </label>
              <label className="settings-field">
                <span>WhatsApp / mobile</span>
                <input
                  value={me.phone}
                  onChange={(e) => setMe({ ...me, phone: e.target.value })}
                  placeholder="+234 801 234 5678"
                  inputMode="tel"
                />
              </label>
              <div className="settings-row-2">
                <label className="settings-field">
                  <span>City</span>
                  <input value={me.city} onChange={(e) => setMe({ ...me, city: e.target.value })} placeholder="Lagos" />
                </label>
                <label className="settings-field">
                  <span>Country</span>
                  <input
                    value={me.country}
                    onChange={(e) => setMe({ ...me, country: e.target.value })}
                    placeholder="Nigeria"
                  />
                </label>
              </div>
              <label className="settings-field">
                <span>Fashion preference</span>
                <select
                  value={me.fashion_preference}
                  onChange={(e) => setMe({ ...me, fashion_preference: e.target.value })}
                >
                  <option value="">No default</option>
                  <option value="female">Hers</option>
                  <option value="male">His</option>
                </select>
              </label>
              <label className="settings-field">
                <span>Short note (optional)</span>
                <textarea
                  value={me.bio}
                  onChange={(e) => setMe({ ...me, bio: e.target.value })}
                  placeholder="Occasion wear · diaspora sizing notes…"
                  rows={3}
                />
              </label>
            </div>
            <div className="settings-actions">
              <button type="button" className="btn" onClick={saveProfile}>
                Save profile
              </button>
              {!profile && (
                <button type="button" className="btn btn-ghost" onClick={() => go?.("home")}>
                  Sign in for cloud sync
                </button>
              )}
            </div>
          </article>

          {/* Reel schedule */}
          <article className="settings-card settings-card-accent">
            <header className="settings-card-h">
              <span className="settings-kicker">Notification reels</span>
              <h2>When fashion lands</h2>
              <p>
                Curated image reels from the platform — pick channels and a schedule. Brands in the paid pool fund the
                inventory; you control the clock.
              </p>
            </header>

            <div className="settings-channels">
              {[
                ["inapp", "In-app inbox", "Always available in Reels"],
                ["email", "Email", "Needs an email on your profile"],
                ["webpush", "Web push", "Browser banner when a reel lands"],
                ["whatsapp", "WhatsApp", "Deep link / Cloud send when enabled"],
              ].map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  className={"settings-channel" + (prefs.channels?.[id] ? " on" : "")}
                  onClick={() => setChannel(id, !prefs.channels?.[id])}
                >
                  <span className="settings-channel-dot" aria-hidden />
                  <span>
                    <strong>{label}</strong>
                    <em>{hint}</em>
                  </span>
                </button>
              ))}
            </div>

            {prefs.channels?.webpush && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} disabled={busy} onClick={enablePush}>
                {busy ? "Enabling…" : "Enable browser notifications"}
              </button>
            )}

            <div className="tick-label" style={{ marginTop: 8 }}>
              Cadence
            </div>
            <div className="settings-seg">
              {[
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["biweekly", "Every 2 weeks"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={"settings-seg-btn" + (sched.frequency === id ? " on" : "")}
                  onClick={() => setPrefs({ ...prefs, schedule: { ...sched, frequency: id } })}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="tick-label">Preferred days</div>
            <div className="settings-days">
              {DAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={"settings-day" + ((sched.days || []).includes(d.id) ? " on" : "")}
                  onClick={() => toggleDay(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="settings-row-2" style={{ marginTop: 14 }}>
              <label className="settings-field">
                <span>Preferred time</span>
                <input
                  type="time"
                  value={sched.time_local || "18:00"}
                  onChange={(e) => setPrefs({ ...prefs, schedule: { ...sched, time_local: e.target.value } })}
                />
              </label>
              <label className="settings-field">
                <span>Timezone</span>
                <select
                  value={sched.timezone_hint || "Africa/Lagos"}
                  onChange={(e) => setPrefs({ ...prefs, schedule: { ...sched, timezone_hint: e.target.value } })}
                >
                  <option value="Africa/Lagos">Africa/Lagos</option>
                  <option value="Africa/Accra">Africa/Accra</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </label>
            </div>

            <div className="settings-row-2">
              <label className="settings-field">
                <span>Quiet hours start</span>
                <input
                  type="time"
                  value={sched.quiet_start || "22:00"}
                  onChange={(e) => setPrefs({ ...prefs, schedule: { ...sched, quiet_start: e.target.value } })}
                />
              </label>
              <label className="settings-field">
                <span>Quiet hours end</span>
                <input
                  type="time"
                  value={sched.quiet_end || "07:00"}
                  onChange={(e) => setPrefs({ ...prefs, schedule: { ...sched, quiet_end: e.target.value } })}
                />
              </label>
            </div>

            <div className="settings-actions">
              <button type="button" className="btn btn-gold" onClick={saveSchedule}>
                Save reel schedule
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => go?.("reels")}>
                Open Reels inbox
              </button>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
