import React, { useEffect, useState } from "react";
import { Data, isTesting } from "../lib/dataBridge.js";
import { DEFAULT_COMMISSION_PCT, TRUST_COPY } from "../lib/commerce.js";
import {
  emptyVettingDossier,
  vettingMinimumsMet,
  vettingGaps,
  snapCacListing,
  openCacPortal,
  saveCreatorVetting,
  CAC_PORTAL_URL,
} from "../lib/eVetStore.js";

/**
 * Admin — vetted promotion privilege UI.
 * Promoted + e-vetted only after CAC verify + KYC minimums (RC, address, director, TIN, ID, scandals).
 * Cart unlocks when is_e_vetted.
 */
export function EVettingStudio() {
  const [rows, setRows] = useState([]);
  const [commission, setCommission] = useState(DEFAULT_COMMISSION_PCT);
  const [flash, setFlash] = useState("");
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState(emptyVettingDossier());
  const [cacPaste, setCacPaste] = useState("");

  const reload = () => {
    Data.creators().then((list) => setRows(list || []));
  };

  useEffect(() => {
    reload();
    window.addEventListener("myyanga:evet", reload);
    return () => window.removeEventListener("myyanga:evet", reload);
  }, []);

  const openBrand = (c) => {
    setOpenId(c.id);
    setDraft({ ...emptyVettingDossier(), ...c });
    setCacPaste(c.cac_snap_raw || "");
    setFlash("");
  };

  const persist = async (id, partial) => {
    try {
      await saveCreatorVetting(id, partial);
      setTimeout(() => reload(), 40);
      return true;
    } catch (e) {
      setFlash(e.message || "Save failed");
      return false;
    }
  };

  const saveDraft = async (extra = {}) => {
    if (!openId) return;
    const next = { ...draft, ...extra };
    setDraft(next);
    if (await persist(openId, next)) setFlash("Dossier saved");
  };

  const approveEVet = async () => {
    const gaps = vettingGaps(draft);
    if (gaps.length) {
      setFlash(`Cannot e-vet yet — missing: ${gaps.join(", ")}`);
      return;
    }
    const next = {
      ...draft,
      is_e_vetted: true,
      is_promoted: true,
      vetted_at: new Date().toISOString(),
      flutterwave_subaccount_id: draft.flutterwave_subaccount_id || `RS_MOCK_${openId}`,
    };
    setDraft(next);
    if (await persist(openId, next)) setFlash("Approved — brand promoted & cart unlocked");
  };

  const revokeEVet = async () => {
    const next = { ...draft, is_e_vetted: false };
    setDraft(next);
    if (await persist(openId, next)) setFlash("E-vet revoked — cart locked for this brand");
  };

  const onIdShot = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({
        ...d,
        id_shot_data_url: String(reader.result || ""),
        id_shot_note: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const applySnap = () => {
    const snapped = snapCacListing(cacPaste, draft);
    setDraft(snapped);
    setFlash("CAC listing snapped into form — review & tick verify");
  };

  const active = rows.find((r) => r.id === openId);

  return (
    <div className="evet-studio">
      <h3 className="serif" style={{ marginTop: 0 }}>
        Vetted promotion & CAC e-vetting
      </h3>
      <p className="muted" style={{ fontSize: 13, maxWidth: 720 }}>
        {TRUST_COPY} Privilege: <strong>brand_e_vetting</strong>. Tick e-vetted only after CAC check (portal → snap
        into form), director ID, TIN, contacts, and scandal search. Promotion + cart unlock together on approve.
        Default commission {commission}%.
        {isTesting() ? " Testing saves in this browser." : " Production: creators + migration 010."}
      </p>

      <label className="bag-field" style={{ maxWidth: 200, marginBottom: 16 }}>
        <span>Commission %</span>
        <input
          type="number"
          min={0}
          max={40}
          step={0.5}
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value))}
        />
      </label>

      {flash && <p className={"pdp-flash" + (flash.startsWith("Cannot") ? " pdp-err" : "")}>{flash}</p>}

      <div className="evet-list">
        {rows.map((c) => (
          <button
            key={c.id}
            type="button"
            className={"evet-list-row" + (openId === c.id ? " on" : "")}
            onClick={() => openBrand(c)}
          >
            <span>
              <strong>{c.name}</strong>
              <em>
                {c.city} · {c.country}
              </em>
            </span>
            <span className="evet-badges">
              {c.is_promoted ? <i className="on">Promoted</i> : <i>Not promoted</i>}
              {c.is_e_vetted ? <i className="on">E-vetted · Cart</i> : <i>Cart locked</i>}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <article className="evet-dossier">
          <header className="evet-dossier-h">
            <div>
              <span className="settings-kicker">Dossier</span>
              <h4 className="serif">{active.name}</h4>
            </div>
            <div className="evet-dossier-actions">
              <a className="btn btn-ghost btn-sm" href={CAC_PORTAL_URL} target="_blank" rel="noreferrer">
                Open CAC portal
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => openCacPortal(draft.cac_rc_number || draft.legal_name || active.name)}
              >
                Search CAC for this brand
              </button>
            </div>
          </header>

          <div className="evet-cac-snap">
            <label className="settings-field">
              <span>Paste / snap CAC portal listing</span>
              <textarea
                rows={4}
                value={cacPaste}
                onChange={(e) => setCacPaste(e.target.value)}
                placeholder={`Company Name: …\nRC Number: RC…\nAddress: …\nDirector: …\nTIN: …`}
              />
            </label>
            <button type="button" className="btn btn-gold btn-sm" onClick={applySnap}>
              Snap listing into form
            </button>
          </div>

          <div className="evet-grid">
            <label className="settings-field">
              <span>CAC / RC number</span>
              <input
                value={draft.cac_rc_number}
                onChange={(e) => setDraft({ ...draft, cac_rc_number: e.target.value })}
                placeholder="RC########"
              />
            </label>
            <label className="settings-field">
              <span>Legal business name</span>
              <input
                value={draft.legal_name}
                onChange={(e) => setDraft({ ...draft, legal_name: e.target.value })}
                placeholder="As on CAC"
              />
            </label>
            <label className="settings-field evet-span-2">
              <span>Registered address</span>
              <input
                value={draft.registered_address}
                onChange={(e) => setDraft({ ...draft, registered_address: e.target.value })}
                placeholder="As on CAC"
              />
            </label>
            <label className="settings-field">
              <span>Main director</span>
              <input
                value={draft.main_director}
                onChange={(e) => setDraft({ ...draft, main_director: e.target.value })}
              />
            </label>
            <label className="settings-field">
              <span>TIN</span>
              <input value={draft.tin} onChange={(e) => setDraft({ ...draft, tin: e.target.value })} />
            </label>
            <label className="settings-field">
              <span>Contact email</span>
              <input
                type="email"
                value={draft.contact_email}
                onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })}
              />
            </label>
            <label className="settings-field">
              <span>Contact phone</span>
              <input
                value={draft.contact_phone}
                onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value })}
              />
            </label>
            <label className="settings-field">
              <span>Instagram</span>
              <input
                value={draft.social_instagram}
                onChange={(e) => setDraft({ ...draft, social_instagram: e.target.value })}
                placeholder="@handle or URL"
              />
            </label>
            <label className="settings-field">
              <span>WhatsApp</span>
              <input
                value={draft.social_whatsapp}
                onChange={(e) => setDraft({ ...draft, social_whatsapp: e.target.value })}
                placeholder="+234…"
              />
            </label>
            <label className="settings-field evet-span-2">
              <span>Past scandals / adverse media search</span>
              <textarea
                rows={3}
                value={draft.scandals_notes}
                onChange={(e) => setDraft({ ...draft, scandals_notes: e.target.value })}
                placeholder="Search notes, sources, date checked…"
              />
            </label>
            <label className="settings-field">
              <span>Director ID shot</span>
              <input type="file" accept="image/*,.pdf" onChange={(e) => onIdShot(e.target.files?.[0])} />
              {draft.id_shot_note && <em className="muted">{draft.id_shot_note}</em>}
              {draft.id_shot_data_url?.startsWith("data:image") && (
                <img className="evet-id-preview" src={draft.id_shot_data_url} alt="ID preview" />
              )}
            </label>
            <label className="settings-field">
              <span>Flutterwave subaccount (RS_…)</span>
              <input
                value={draft.flutterwave_subaccount_id}
                onChange={(e) => setDraft({ ...draft, flutterwave_subaccount_id: e.target.value })}
                placeholder="Required for live settlement"
              />
            </label>
          </div>

          <div className="evet-ticks">
            <label className="tick-box">
              <input
                type="checkbox"
                checked={!!draft.cac_verified}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    cac_verified: e.target.checked,
                    cac_verified_at: e.target.checked ? new Date().toISOString() : null,
                  })
                }
              />
              <span className="tick-mark">{draft.cac_verified ? "✓" : ""}</span>
              <span className="tick-text">CAC verified (portal match confirmed)</span>
            </label>
            <label className="tick-box">
              <input
                type="checkbox"
                checked={!!draft.scandals_cleared}
                onChange={(e) => setDraft({ ...draft, scandals_cleared: e.target.checked })}
              />
              <span className="tick-mark">{draft.scandals_cleared ? "✓" : ""}</span>
              <span className="tick-text">Scandals / adverse media cleared</span>
            </label>
            <label className="tick-box">
              <input
                type="checkbox"
                checked={!!draft.is_promoted}
                onChange={(e) => setDraft({ ...draft, is_promoted: e.target.checked })}
              />
              <span className="tick-mark">{draft.is_promoted ? "✓" : ""}</span>
              <span className="tick-text">Promoted (Discover + VW pool)</span>
            </label>
          </div>

          {!vettingMinimumsMet(draft) && (
            <p className="muted" style={{ fontSize: 12 }}>
              Still needed: {vettingGaps(draft).join(" · ")}
            </p>
          )}

          <div className="settings-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => saveDraft()}>
              Save dossier
            </button>
            <button type="button" className="btn" disabled={!vettingMinimumsMet(draft)} onClick={approveEVet}>
              Approve e-vet + unlock cart
            </button>
            {draft.is_e_vetted && (
              <button type="button" className="btn btn-ghost" onClick={revokeEVet}>
                Revoke e-vet
              </button>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
