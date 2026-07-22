// Client-side responsive auto-sizing: Mobile/Tablet/Desktop renditions.
const DEVICE_PRESETS = [{ label: "Mobile", w: 480 }, { label: "Tablet", w: 1024 }, { label: "Desktop", w: 1600 }];
const readFile = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
export async function resizeForDevices(file) {
  const img = await loadImg(await readFile(file));
  return DEVICE_PRESETS.map(({ label, w }) => {
    const s = Math.min(1, w / img.width), cw = Math.max(1, Math.round(img.width * s)), ch = Math.max(1, Math.round(img.height * s));
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; c.getContext("2d").drawImage(img, 0, 0, cw, ch);
    const url = c.toDataURL("image/jpeg", 0.82);
    return { label, width: cw, height: ch, url, kb: Math.round((url.length * 0.75) / 1024) };
  });
}
