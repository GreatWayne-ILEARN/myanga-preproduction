/**
 * Apple-minimal bag — local until checkout; then gateway settles.
 */
import { sizesForGarment, coloursForGarment, isBrandShopReady } from "./commerce.js";

const KEY = "myyanga_bag_v1";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"items":[]}');
  } catch {
    return { items: [] };
  }
}

function write(bag) {
  localStorage.setItem(KEY, JSON.stringify(bag));
  window.dispatchEvent(new CustomEvent("myyanga:bag", { detail: bag }));
  return bag;
}

export function loadBag() {
  return read();
}

export function bagCount() {
  return read().items.reduce((s, i) => s + (i.qty || 1), 0);
}

export function bagSubtotal() {
  return read().items.reduce((s, i) => s + (i.unit_price_ngn || 0) * (i.qty || 1), 0);
}

export function lineKey(garmentId, size, colour) {
  return `${garmentId}__${size || ""}__${colour || ""}`;
}

/**
 * Add garment to bag. Requires e-vetted brand + size (when matrix > 1).
 */
export function addToBag({ garment, creator, size, colour, qty = 1 }) {
  if (!isBrandShopReady(creator)) {
    throw new Error("This designer is not e-vetted yet — cart opens after vetting.");
  }
  const sizes = sizesForGarment(garment);
  if (sizes.length > 1 && !size) throw new Error("Select a size");
  const colours = coloursForGarment(garment);
  const chosenColour = colour || colours[0];
  const key = lineKey(garment.id, size || sizes[0], chosenColour);
  const bag = read();
  const existing = bag.items.find((i) => i.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    bag.items.push({
      key,
      garment_id: garment.id,
      creator_id: creator.id,
      brand_name: creator.name,
      name: garment.name,
      image: garment.image,
      part: garment.part,
      size: size || sizes[0],
      colour: chosenColour,
      qty,
      unit_price_ngn: garment.price_ngn || 0,
      flutterwave_subaccount_id: creator.flutterwave_subaccount_id || null,
      paystack_subaccount_code: creator.paystack_subaccount_code || null,
    });
  }
  return write(bag);
}

export function updateQty(key, qty) {
  const bag = read();
  const it = bag.items.find((i) => i.key === key);
  if (!it) return bag;
  if (qty <= 0) bag.items = bag.items.filter((i) => i.key !== key);
  else it.qty = qty;
  return write(bag);
}

export function removeFromBag(key) {
  const bag = read();
  bag.items = bag.items.filter((i) => i.key !== key);
  return write(bag);
}

export function clearBag() {
  return write({ items: [] });
}

export function useBagTick(React) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const bump = () => setN((x) => x + 1);
    window.addEventListener("myyanga:bag", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("myyanga:bag", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return n;
}
