import React, { useEffect, useState } from "react";
import { PayGate } from "../components/PayGate.jsx";
import { supabase, hasSupabase } from "../lib/supabase.js";
import { isProduction } from "../lib/dataBridge.js";

export function EventsPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!hasSupabase || !isProduction()) {
      setEvents([
        { id: 1, title: "Lagos Fashion Week Preview", venue: "Eko Hotel", city: "Lagos", starts_at: new Date().toISOString() },
      ]);
      return;
    }
    supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .then(({ data }) => setEvents(data || []));
  }, []);

  return (
    <PayGate feature="events">
      <div className="wrap page-head">
        <div className="crumbs">Home / Events</div>
        <h1>Events</h1>
        <p className="lead">Fashion weeks, bridal expos, and creator showcases across Africa.</p>
      </div>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="grid g2">
            {events.map((e) => (
              <div key={e.id} className="panel">
                <div className="eyebrow">{new Date(e.starts_at).toLocaleDateString()}</div>
                <h3 className="serif">{e.title}</h3>
                <p className="muted" style={{ fontSize: 13 }}>
                  {e.venue}, {e.city}
                </p>
                {e.description && <p style={{ fontSize: 14 }}>{e.description}</p>}
                {e.ticket_url && (
                  <a href={e.ticket_url} className="btn" style={{ display: "inline-block", marginTop: 10 }} target="_blank" rel="noreferrer">
                    Get tickets
                  </a>
                )}
              </div>
            ))}
          </div>
          {!events.length && <p className="muted">No upcoming events.</p>}
        </div>
      </section>
    </PayGate>
  );
}
