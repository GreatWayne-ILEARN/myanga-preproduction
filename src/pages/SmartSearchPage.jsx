import React, { useState, useEffect, useRef } from "react";
import { PayGate } from "../components/PayGate.jsx";
import { smartSearch, shuffleDecks } from "../lib/smartSearch.js";
import { Data, isProduction } from "../lib/dataBridge.js";
import { buildLookDeck } from "../lib/virtualWear.js";
import { emptyMultiFilters, matchGarment } from "../lib/catalog.js";
import { RefineFilters } from "../components/RefineFilters.jsx";
import { Pager, usePaged } from "../components/Pager.jsx";
import { usePerPage } from "../hooks/usePerPage.js";
import { trackSearch, trackProductSelect } from "../lib/analytics.js";

const naira = (n) => "₦" + Number(n || 0).toLocaleString();

function normalizeSeed(seed) {
  const base = emptyMultiFilters();
  if (!seed) return base;
  return {
    ...base,
    ...seed,
    gender: seed.gender || "",
    categories: seed.categories || (seed.category ? [seed.category] : []),
    countries: seed.countries || [],
    events: seed.events || (seed.event ? [seed.event] : []),
    styles: seed.styles || (seed.style ? [seed.style] : []),
    colours: seed.colours || (seed.colour ? [seed.colour] : []),
    parts: seed.parts || [],
    priceBands: seed.priceBands || [],
    query: seed.query || "",
    promotedOnly: !!seed.promotedOnly,
  };
}

function SmartSearchInner({ seed, seedKey, go }) {
  const [filters, setFilters] = useState(() => normalizeSeed(seed));
  const [decks, setDecks] = useState([]);
  const [garments, setGarments] = useState([]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ranSeed = useRef(null);

  const search = async (override) => {
    const active = normalizeSeed({ ...filters, ...(override || {}) });
    if (override) setFilters(active);
    if (!active.gender) {
      setErr("Pick His or Hers first, then tick any filters you want.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      if (!isProduction()) {
        const rows = (await Data.garments()).filter((g) => matchGarment(g, active));
        const byStyle = new Map();
        for (const g of rows.filter((r) => r.part === "main_outfit")) {
          const k = g.style || "Look";
          if (!byStyle.has(k)) byStyle.set(k, []);
          byStyle.get(k).push(g);
        }
        const accessories = rows.filter((r) => r.part !== "main_outfit");
        const nextDecks = [];
        for (const [styleName, items] of byStyle) {
          const pool = [...items, ...accessories];
          const deck = buildLookDeck(pool.slice(0, 8), { style: styleName });
          nextDecks.push({ title: `${styleName} look`, items: deck.items, total_ngn: deck.total_ngn });
          if (nextDecks.length >= 8) break;
        }
        setGarments(rows);
        setDecks(
          nextDecks.length
            ? nextDecks
            : rows.length
              ? [
                  {
                    title: "Matched pieces",
                    items: rows.slice(0, 5),
                    total_ngn: rows.slice(0, 5).reduce((s, g) => s + (g.price_ngn || 0), 0),
                  },
                ]
              : [],
        );
        setSummary(
          `Testing mode — ${rows.length} piece(s) match your ticks (${active.gender === "male" ? "His" : "Hers"}).`,
        );
        trackSearch(active, { result_count: rows.length });
        return;
      }
      const params = {
        gender: active.gender,
        categories: active.categories,
        countries: active.countries,
        events: active.events,
        styles: active.styles,
        colours: active.colours,
        parts: active.parts,
        budgetMin: active.budgetMin ? +active.budgetMin : undefined,
        budgetMax: active.budgetMax ? +active.budgetMax : undefined,
        promotedOnly: active.promotedOnly,
        query: active.query || undefined,
      };
      const d = await smartSearch(params);
      if (d.paymentRequired) {
        setErr("Payment required for Smart Search");
        return;
      }
      setGarments(d.garments || []);
      setDecks(d.decks || []);
      setSummary(d.summary || "");
      trackSearch(active, { result_count: (d.garments || []).length });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!seed || seedKey == null) return;
    if (ranSeed.current === seedKey) return;
    ranSeed.current = seedKey;
    const merged = normalizeSeed(seed);
    setFilters(merged);
    if (merged.gender) search(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const shuffle = () => setDecks((d) => shuffleDecks(d));

  const outfits = garments.filter((g) => g.part === "main_outfit");
  const shoes = garments.filter((g) => g.part === "shoes");
  const bags = garments.filter((g) => g.part === "bag");
  const deckPer = usePerPage("smart_decks");
  const outfitPer = usePerPage("smart_outfits");
  const shoePer = usePerPage("smart_shoes");
  const bagPer = usePerPage("smart_bags");
  const deckPage = usePaged(decks, deckPer);
  const outfitPage = usePaged(outfits, outfitPer);
  const shoePage = usePaged(shoes, shoePer);
  const bagPage = usePaged(bags, bagPer);

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">Home / Smart Search</div>
        <h1>Smart Search</h1>
        <p className="lead">
          Start with His or Hers, then tick as many categories, countries, events, styles, colours, pieces and price
          bands as you need. Every tick narrows the result set together.
        </p>
      </div>
      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <div className="panel" style={{ marginBottom: 20 }}>
            <RefineFilters filters={filters} setFilters={setFilters} />
            <div className="action-row">
              <button className="btn" disabled={busy || !filters.gender} onClick={() => search()}>
                {busy ? "Searching…" : "Apply all filters"}
              </button>
              {decks.length > 1 && (
                <button className="btn btn-ghost" type="button" onClick={shuffle}>
                  Shuffle decks
                </button>
              )}
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setFilters(emptyMultiFilters());
                  setDecks([]);
                  setGarments([]);
                  setSummary("");
                  setErr("");
                }}
              >
                Clear
              </button>
            </div>
            {err && <p style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{err}</p>}
            {summary && (
              <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
                {summary}
              </p>
            )}
          </div>

          {deckPage.slice.map((deck, i) => (
            <div key={i} className="look" style={{ marginBottom: 20 }}>
              <div className="head">
                <span style={{ fontWeight: 800 }}>{deck.title}</span>
                <span>{naira(deck.total_ngn)}</span>
              </div>
              <div className="items">
                {deck.items.map((it) => (
                  <div className="it" key={it.id || it.name}>
                    <span>
                      {it.name} · <span className="muted">{it.creator?.name || it.brand || ""}</span>
                    </span>
                    <span>{naira(it.price_ngn || it.price)}</span>
                  </div>
                ))}
                <div className="tot">
                  <span>Complete look</span>
                  <span>{naira(deck.total_ngn)}</span>
                </div>
              </div>
            </div>
          ))}
          <Pager page={deckPage.page} totalPages={deckPage.totalPages} onChange={deckPage.setPage} />

          {(outfits.length > 0 || shoes.length > 0 || bags.length > 0) && (
            <div className="result-split">
              {[
                ["Outfits", outfitPage],
                ["Shoes", shoePage],
                ["Bags", bagPage],
              ].map(([title, pg]) =>
                pg.total ? (
                  <div key={title} className="vw-section">
                    <div className="vw-section-h">
                      {title} ({pg.total})
                    </div>
                    <div className="grid g4">
                      {pg.slice.map((g) => (
                        <div
                          key={g.id}
                          className="card"
                          style={{ cursor: go ? "pointer" : undefined }}
                          onClick={() => {
                            trackProductSelect?.(g);
                            go?.("product", { garmentId: g.id });
                          }}
                        >
                          {(g.image || g.card_image) && (
                            <img
                              src={g.image || g.card_image}
                              alt=""
                              style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
                            />
                          )}
                          <div className="meta">
                            <div className="t">{g.name}</div>
                            <div className="b">
                              {g.creator?.name} · {g.country}
                            </div>
                            <div className="p">{naira(g.price_ngn)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pager page={pg.page} totalPages={pg.totalPages} onChange={pg.setPage} />
                  </div>
                ) : null,
              )}
            </div>
          )}

          {!decks.length && !busy && !garments.length && (
            <p className="muted">Pick His or Hers, tick filters, then Apply.</p>
          )}
        </div>
      </section>
    </>
  );
}

export function SmartSearchPage({ seed, seedKey, go }) {
  return (
    <PayGate feature="smart_search">
      <SmartSearchInner seed={seed} seedKey={seedKey} go={go} />
    </PayGate>
  );
}
