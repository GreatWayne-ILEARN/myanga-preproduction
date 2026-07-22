import React, { useEffect } from "react";
import { installAutocapture, trackPageView } from "../lib/analytics.js";

/** Mount once: anonymized click autocapture + initial page signal. */
export function SiteAnalytics({ view }) {
  useEffect(() => installAutocapture(), []);
  useEffect(() => {
    trackPageView(view);
  }, [view]);
  return null;
}
