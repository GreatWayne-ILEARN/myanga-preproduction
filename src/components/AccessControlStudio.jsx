import React, { useEffect, useState } from "react";
import {
  FOUNDING_OWNER_EMAIL,
  PRIVILEGE_CATALOG,
  listAccessDirectory,
  transferSuperAdmin,
  addCoOwner,
  removeCoOwner,
  grantPrivileges,
  revokePrivileges,
  claimFoundingOwner,
} from "../lib/accessControl.js";

/**
 * Expert Access Control studio — transfer, co-share, allocate privileges.
 * Visible to super admin / co-owners; mutations for transfer/co-share are owner-only server-side.
 */
export function AccessControlStudio({ profile }) {
  const [dir, setDir] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState("directory"); // directory | grant | coshare | transfer
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState("");
  const [picked, setPicked] = useState([]);

  const isOwner = !!(profile?.is_owner || profile?.role === "owner");
  const canManage = isOwner || profile?.is_co_owner;

  const reload = async () => {
    setErr("");
    try {
      setDir(await listAccessDirectory());
    } catch (e) {
      setErr(e.message || "Could not load access directory");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const run = async (fn, okMsg) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      window.__toast?.(okMsg);
      setEmail("");
      setNote("");
      setConfirm("");
      setPicked([]);
      await reload();
    } catch (e) {
      setErr(e.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <p className="muted">
        Access Control is restricted to the super admin and co-owners. Founding account:{" "}
        <b>{FOUNDING_OWNER_EMAIL}</b>
      </p>
    );
  }

  if (!dir) return <p className="muted">Loading access directory…</p>;

  const togglePriv = (id) =>
    setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0 }}>Access Control</h2>
      <div className="cs-banner">
        <span>
          Founding super admin: <b>{dir.founding_owner_email || FOUNDING_OWNER_EMAIL}</b>
          {dir.testing ? " · Testing / pre-prod local directory" : " · Live directory"}
        </span>
        <span className="cs-pill">{isOwner ? "SUPER ADMIN" : "CO-OWNER"}</span>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {[
          ["directory", "Directory"],
          ["grant", "Allocate privileges"],
          ["coshare", "Co-share ownership"],
          ["transfer", "Transfer super admin"],
        ].map(([k, l]) => (
          <span
            key={k}
            className="chip"
            style={panel === k ? { background: "var(--maroon)", color: "#fff" } : {}}
            onClick={() => setPanel(k)}
          >
            {l}
          </span>
        ))}
      </div>

      {err && <p style={{ color: "#b00020", fontSize: 13 }}>{err}</p>}

      {panel === "directory" && (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <h4 style={{ marginTop: 0 }}>Super admin & co-owners</h4>
            <div className="del-rows">
              {(dir.owners || []).map((o) => (
                <div className="del-row" key={o.id || o.email}>
                  <span>
                    <b>{o.name || o.email}</b> · {o.email}
                    {o.is_owner ? " · sole super admin" : ""}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>{o.role}</span>
                </div>
              ))}
              {(dir.co_owners || []).map((c) => (
                <div className="del-row" key={c.user_id || c.email}>
                  <span>
                    {c.email} · co-owner{c.note ? ` · ${c.note}` : ""}
                  </span>
                  {isOwner && (
                    <button className="link-danger" onClick={() => run(() => removeCoOwner(c.email), "Co-owner removed")}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {profile?.email?.toLowerCase() === FOUNDING_OWNER_EMAIL.toLowerCase() && !profile?.is_owner && (
              <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={() => run(claimFoundingOwner, "Founding ownership claimed")}>
                Claim founding super admin
              </button>
            )}
          </div>

          <div className="panel">
            <h4 style={{ marginTop: 0 }}>Admins & privilege map</h4>
            <div className="del-rows">
              {(dir.admins || []).map((a) => (
                <div className="del-row" key={a.id || a.email} style={{ alignItems: "flex-start" }}>
                  <span>
                    <div style={{ fontWeight: 700 }}>{a.name || a.email}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{a.email} · {a.role}{a.is_owner ? " · owner" : ""}</div>
                    <div className="chips" style={{ marginTop: 6 }}>
                      {(a.privileges || []).length
                        ? a.privileges.map((p) => (
                            <span key={p} className="chip" style={{ fontSize: 10 }}>{p}</span>
                          ))
                        : a.is_owner || a.role === "owner"
                          ? <span className="chip" style={{ fontSize: 10 }}>all privileges</span>
                          : <span className="muted" style={{ fontSize: 11 }}>no grants yet</span>}
                    </div>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {(dir.audit || []).length > 0 && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h4 style={{ marginTop: 0 }}>Recent access audit</h4>
              <div className="del-rows">
                {dir.audit.slice(0, 12).map((a, i) => (
                  <div className="del-row" key={i}>
                    <span>
                      <b>{a.action}</b> → {a.target_email || "—"}
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {panel === "grant" && (
        <div className="cs-grid">
          <div className="panel">
            <h4 style={{ marginTop: 0 }}>Allocate privileges</h4>
            <p className="muted" style={{ fontSize: 12 }}>
              Target must have signed in at least once. They are promoted to admin when you grant.
            </p>
            <div className="field">
              <label>User email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@brand.com" />
            </div>
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              {PRIVILEGE_CATALOG.map((p) => (
                <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={picked.includes(p.id)} onChange={() => togglePriv(p.id)} />
                  <span>
                    <b>{p.label}</b>
                    <div className="muted" style={{ fontSize: 11 }}>{p.desc}</div>
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn"
                disabled={busy || !email || !picked.length}
                onClick={() => run(() => grantPrivileges(email.trim(), picked), "Privileges granted")}
              >
                Grant selected
              </button>
              <button
                className="btn btn-ghost"
                disabled={busy || !email || !picked.length}
                onClick={() => run(() => revokePrivileges(email.trim(), picked), "Privileges revoked")}
              >
                Revoke selected
              </button>
            </div>
          </div>
          <div className="panel" style={{ background: "var(--cream)" }}>
            <div className="eyebrow">Flow</div>
            <h3 className="serif" style={{ fontSize: 22, margin: "6px 0" }}>Least privilege</h3>
            <ol style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: "#4a463d" }}>
              <li>Colleague signs in with Google or email once.</li>
              <li>You grant only the studios they need.</li>
              <li>Dangerous actions (`delete_all`) stay owner-gated unless explicitly granted.</li>
              <li>Co-owners can also allocate — transfer remains super-admin only.</li>
            </ol>
          </div>
        </div>
      )}

      {panel === "coshare" && (
        <div className="panel" style={{ maxWidth: 520 }}>
          <h4 style={{ marginTop: 0 }}>Co-share super admin rights</h4>
          <p className="muted" style={{ fontSize: 12 }}>
            Co-owners get full privilege access and can allocate rights. Only the sole super admin can add/remove co-owners or transfer ownership.
          </p>
          {!isOwner && <p style={{ color: "#b00020", fontSize: 13 }}>Only the current super admin can co-share.</p>}
          <div className="field">
            <label>Co-owner email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isOwner} placeholder="partner@company.com" />
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} disabled={!isOwner} placeholder="Operations lead" />
          </div>
          <button
            className="btn"
            disabled={busy || !isOwner || !email}
            onClick={() => run(() => addCoOwner(email.trim(), note.trim()), "Co-owner added")}
          >
            Add co-owner
          </button>
        </div>
      )}

      {panel === "transfer" && (
        <div className="panel" style={{ maxWidth: 520, borderColor: "#b00020" }}>
          <h4 style={{ marginTop: 0, color: "#b00020" }}>Transfer super admin</h4>
          <p className="muted" style={{ fontSize: 12 }}>
            Moves sole ownership to another signed-in user. You become a co-owner afterwards so you are not locked out. Irreversible without their cooperation.
          </p>
          {!isOwner && <p style={{ color: "#b00020", fontSize: 13 }}>Only the current super admin can transfer.</p>}
          <div className="field">
            <label>New super admin email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isOwner} />
          </div>
          <div className="field">
            <label>Type TRANSFER SUPER ADMIN to confirm</label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!isOwner} placeholder="TRANSFER SUPER ADMIN" />
          </div>
          <button
            className="btn btn-danger"
            disabled={busy || !isOwner || !email || confirm !== "TRANSFER SUPER ADMIN"}
            onClick={() => run(() => transferSuperAdmin(email.trim(), confirm), "Super admin transferred")}
          >
            Transfer ownership
          </button>
        </div>
      )}
    </div>
  );
}
