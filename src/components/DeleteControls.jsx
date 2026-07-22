import { useState } from "react";

/**
 * Role-based delete UI (mirrors the spec's two-layer model).
 * - owner: sees "Delete All" + per-row + multi-select.
 * - admin: per-row + multi-select only (no Delete All).
 * - others: no delete controls.
 * The server-side guard (delete_all_records / RLS) is the real enforcement;
 * this is the UI layer.
 */
export function DeleteControls({ userRole, rows, getId, onDeleteSelected, onDeleteAll, label = "records" }) {
  const [selected, setSelected] = useState(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [phrase, setPhrase] = useState("");

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isAdmin = userRole === "owner" || userRole === "admin";
  if (!isAdmin) return null;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        {userRole === "owner" && (
          <button className="btn btn-danger" onClick={() => setConfirmAll(true)}>Delete All {label}</button>
        )}
        <span className="muted" style={{ fontSize: 12 }}>{selected.size} selected</span>
        {selected.size > 0 && (
          <button className="btn btn-danger-soft" onClick={() => { onDeleteSelected?.([...selected]); setSelected(new Set()); }}>
            Delete {selected.size} selected
          </button>
        )}
      </div>

      <div className="del-rows">
        {rows.map((r) => {
          const id = getId(r);
          return (
            <label key={id} className="del-row">
              <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
              <span>{r.name || r.title || r.brand || ("#" + id)}</span>
              <button className="link-danger" onClick={(e) => { e.preventDefault(); onDeleteSelected?.([id]); }}>Delete</button>
            </label>
          );
        })}
      </div>

      {confirmAll && (
        <div className="modal-backdrop" onClick={() => setConfirmAll(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete ALL {label}?</h3>
            <p className="muted">This is owner-only and irreversible. Type <b>DELETE ALL</b> to confirm.</p>
            <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="DELETE ALL" />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => { setConfirmAll(false); setPhrase(""); }}>Cancel</button>
              <button className="btn btn-danger" disabled={phrase !== "DELETE ALL"}
                onClick={() => { onDeleteAll?.(); setConfirmAll(false); setPhrase(""); }}>Confirm delete all</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
