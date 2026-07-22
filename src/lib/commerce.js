/**
 * Marketplace commerce — trust platform model.
 * E-vetted brands unlock cart. Payment settles at Flutterwave/Paystack
 * to brand subaccounts; MyYanga commission is split at the gateway.
 */

export const DEFAULT_COMMISSION_PCT = 8;

/** Selfridges-grade size matrices by product part */
export const SIZE_MATRICES = {
  main_outfit: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "One size", "Custom / Made to measure"],
  shoes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"],
  bag: ["One size", "Mini", "Medium", "Large"],
  head_piece: ["One size", "S/M", "M/L"],
  jewellery: ["One size", "Adjustable"],
  default: ["XS", "S", "M", "L", "XL", "XXL", "One size"],
};

export const SIZE_GUIDE_HINTS = {
  main_outfit: {
    title: "Fit guide",
    rows: [
      { size: "XS", bust: "80–84", waist: "62–66", hip: "86–90" },
      { size: "S", bust: "84–88", waist: "66–70", hip: "90–94" },
      { size: "M", bust: "88–94", waist: "70–76", hip: "94–100" },
      { size: "L", bust: "94–100", waist: "76–82", hip: "100–106" },
      { size: "XL", bust: "100–108", waist: "82–90", hip: "106–114" },
    ],
    note: "Measurements in cm. Diaspora: UK 8 ≈ XS/S, UK 10 ≈ S/M, UK 12 ≈ M, UK 14 ≈ L. Made-to-measure available on select pieces.",
  },
  shoes: {
    title: "Shoe size guide",
    rows: [
      { eu: "37", uk: "4", us: "6.5" },
      { eu: "38", uk: "5", us: "7.5" },
      { eu: "39", uk: "6", us: "8.5" },
      { eu: "40", uk: "6.5", us: "9" },
      { eu: "41", uk: "7", us: "9.5" },
      { eu: "42", uk: "8", us: "10" },
      { eu: "43", uk: "9", us: "11" },
      { eu: "44", uk: "9.5", us: "11.5" },
    ],
    note: "EU sizes shown on product. If between sizes, size up for embroidered slippers and formal oxfords.",
  },
};

export function sizesForGarment(g) {
  if (Array.isArray(g?.sizes_available) && g.sizes_available.length) return g.sizes_available;
  const part = g?.part || "default";
  return SIZE_MATRICES[part] || SIZE_MATRICES.default;
}

export function coloursForGarment(g) {
  if (Array.isArray(g?.colours_available) && g.colours_available.length) return g.colours_available;
  if (Array.isArray(g?.colours) && g.colours.length) return g.colours;
  return ["As shown"];
}

export function isBrandShopReady(creator) {
  if (!creator) return false;
  return !!(creator.is_e_vetted || creator.e_vetted);
}

export function brandSettlementReady(creator, { testing = false } = {}) {
  if (!isBrandShopReady(creator)) return false;
  if (testing) return true;
  return !!(creator.flutterwave_subaccount_id || creator.paystack_subaccount_code);
}

export function splitAmounts(subtotalNgn, commissionPct = DEFAULT_COMMISSION_PCT) {
  const sub = Math.max(0, Math.round(Number(subtotalNgn) || 0));
  const pct = Math.min(40, Math.max(0, Number(commissionPct) || DEFAULT_COMMISSION_PCT));
  const commission = Math.round((sub * pct) / 100);
  const brandNet = Math.max(0, sub - commission);
  return { subtotal_ngn: sub, commission_pct: pct, commission_ngn: commission, brand_net_ngn: brandNet };
}

export function groupCartByBrand(items) {
  const map = new Map();
  for (const it of items) {
    const key = String(it.creator_id || it.brand_name || "unknown");
    if (!map.has(key)) {
      map.set(key, {
        creator_id: it.creator_id,
        brand_name: it.brand_name,
        flutterwave_subaccount_id: it.flutterwave_subaccount_id,
        paystack_subaccount_code: it.paystack_subaccount_code,
        items: [],
        subtotal_ngn: 0,
      });
    }
    const g = map.get(key);
    g.items.push(it);
    g.subtotal_ngn += (it.unit_price_ngn || 0) * (it.qty || 1);
  }
  return [...map.values()];
}

export const TRUST_COPY =
  "MyYanga is a trust platform. You pay through Flutterwave or Paystack; funds settle immediately to the e-vetted designer, with MyYanga’s commission split at the payment gateway — we never hold your purchase money.";
