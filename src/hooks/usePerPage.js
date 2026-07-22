import { useEffect, useState } from "react";
import { getPerPage, onPagerSettingsChange, loadPagerSettings } from "../lib/pagerSettings.js";

/** Live page size for a surface — updates when Studio saves. */
export function usePerPage(key) {
  const [n, setN] = useState(() => getPerPage(key));
  useEffect(() => {
    setN(getPerPage(key));
    return onPagerSettingsChange((s) => setN(s[key] ?? getPerPage(key)));
  }, [key]);
  return n;
}

export function usePagerSettings() {
  const [settings, setSettings] = useState(() => loadPagerSettings());
  useEffect(() => onPagerSettingsChange(setSettings), []);
  return settings;
}
