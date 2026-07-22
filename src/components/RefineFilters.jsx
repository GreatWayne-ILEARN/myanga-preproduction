import React from "react";
import {
  GENDER_OPTIONS,
  CATEGORY_OPTIONS,
  COUNTRY_OPTIONS,
  EVENT_OPTIONS,
  STYLE_OPTIONS,
  COLOUR_OPTIONS,
  PART_OPTIONS,
  PRICE_BANDS,
  toggleIn,
} from "../lib/catalog.js";

/** Bold rectangular multi-tick filter group — no rounded corners, no overlaps. */
export function TickGroup({ label, options, values, onChange, disabled }) {
  return (
    <div className="tick-group">
      <div className="tick-label">{label}</div>
      <div className="tick-grid">
        {options.map((o) => {
          const id = typeof o === "string" ? o : o.id;
          const text = typeof o === "string" ? o : o.label;
          const on = values.includes(id);
          return (
            <label key={id} className={"tick-box" + (on ? " on" : "") + (disabled ? " disabled" : "")}>
              <input
                type="checkbox"
                checked={on}
                disabled={disabled}
                onChange={() => onChange(toggleIn(values, id))}
              />
              <span className="tick-mark" aria-hidden>
                {on ? "✓" : ""}
              </span>
              <span className="tick-text">{text}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Full refine panel: His/Hers required first, then multi-parameter ticks. */
export function RefineFilters({ filters, setFilters, showParts = true }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const genderLocked = !filters.gender;
  const cats = filters.gender ? CATEGORY_OPTIONS[filters.gender] || [] : [];

  return (
    <div className="refine-panel">
      <div className="tick-group">
        <div className="tick-label">1. His or Hers</div>
        <div className="gender-row">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={"gender-btn" + (filters.gender === g.id ? " on" : "")}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  gender: f.gender === g.id ? "" : g.id,
                  categories: [],
                }))
              }
            >
              {g.label}
            </button>
          ))}
        </div>
        {genderLocked && (
          <p className="refine-hint">Pick His or Hers first — then tick any combination of filters below.</p>
        )}
      </div>

      <TickGroup
        label="2. Categories"
        options={cats}
        values={filters.categories || []}
        onChange={(v) => set("categories", v)}
        disabled={genderLocked}
      />
      <TickGroup
        label="3. Countries"
        options={COUNTRY_OPTIONS}
        values={filters.countries || []}
        onChange={(v) => set("countries", v)}
        disabled={genderLocked}
      />
      <TickGroup
        label="4. Events"
        options={EVENT_OPTIONS}
        values={filters.events || []}
        onChange={(v) => set("events", v)}
        disabled={genderLocked}
      />
      <TickGroup
        label="5. Styles"
        options={STYLE_OPTIONS}
        values={filters.styles || []}
        onChange={(v) => set("styles", v)}
        disabled={genderLocked}
      />
      <TickGroup
        label="6. Colours"
        options={COLOUR_OPTIONS}
        values={filters.colours || []}
        onChange={(v) => set("colours", v)}
        disabled={genderLocked}
      />
      {showParts && (
        <TickGroup
          label="7. Pieces"
          options={PART_OPTIONS}
          values={filters.parts || []}
          onChange={(v) => set("parts", v)}
          disabled={genderLocked}
        />
      )}
      <TickGroup
        label="8. Price range"
        options={PRICE_BANDS.map((b) => ({ id: b.id, label: b.label }))}
        values={filters.priceBands || []}
        onChange={(v) => set("priceBands", v)}
        disabled={genderLocked}
      />

      <div className="field" style={{ marginTop: 8 }}>
        <label>Describe what you want</label>
        <input
          placeholder="e.g. Coral agbada for Abuja wedding"
          value={filters.query || ""}
          disabled={genderLocked}
          onChange={(e) => set("query", e.target.value)}
        />
      </div>
      <label className={"tick-box promo" + (filters.promotedOnly ? " on" : "") + (genderLocked ? " disabled" : "")}>
        <input
          type="checkbox"
          checked={!!filters.promotedOnly}
          disabled={genderLocked}
          onChange={(e) => set("promotedOnly", e.target.checked)}
        />
        <span className="tick-mark" aria-hidden>
          {filters.promotedOnly ? "✓" : ""}
        </span>
        <span className="tick-text">Premium / promoted pool only</span>
      </label>
    </div>
  );
}
