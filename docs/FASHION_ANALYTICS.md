# MyYanga fashion analytics model

Anonymized interaction analytics aligned to leading fashion-portal practice.

## Privacy

Every event stores only:

- Random `session_id` (tab) and `device_id` (browser) — **not** account IDs
- Event name, view/path, fashion attributes (colour, style, part, price band, SKU id)

**Never stored:** email, name, phone, WhatsApp, photo bytes, passwords, raw search text.

## Three pillars (current build)

### 1. Hyper-granular product analytics

| Signal | Event | Attributes |
| --- | --- | --- |
| SKU select (VW / thumbs) | `product_select` | sku_id, colours, style, part, gender, price_band, creator_id |
| Search / filter conversion proxy | `search` | gender, colours, styles, events, parts, price_bands, result_count (query text **omitted**) |
| UI pathing | `ui_click`, `page_view` | label, view |

**Return reason matrix** — reasons enumerated (`too_large`, `too_small`, `color_inaccurate`, `poor_fabric_quality`, …). `trackReturnReason()` is ready; counts fill when garment checkout + returns ship.

### 2. Customer behaviour & fit signals

| Signal | Event | Notes |
| --- | --- | --- |
| Virtual try-on render | `vw_render` | scene, gender, designer_id, mode (ai/canvas), parts/styles/colours, skus |
| Share look | `vw_share` | designer_id, scene, mode |
| Pay gates | `pay_gate` | feature, access |
| Auth method (no identity) | `auth_method` | provider only: google / whatsapp / email |

Fit proxy today = try-on engagement + scene choice. True body-measurement fit arrives with size charts + returns.

### 3. Supply / merchandising

| Signal | Source |
| --- | --- |
| Brand placement purchased vs delivered | `brand_placements` table (Reel Config) |
| Designer pool engagement | `product_select` + `vw_engage_designer` / designer clicks |
| Impression metering for reels | Reel outbound log + placements |

## Admin Insights studio

**Both** interaction modes:

1. **Guided filters** — brand (creator), days, gender, colour, style, part, view, event-type tick boxes  
2. **AI ask** — type a question or pick a preset → Generate insight (ai-chat in Production; local heuristic in Testing)

Brand-scoped packs include `orbit_brand_key = myyanga:creator:<id>` for ZonicMe Orbit joins.

## Brand identity (today)

| Field | Role |
| --- | --- |
| `creators.id` | **Canonical unique ID** (bigint) for designers/brands in Virtual Wear + garments |
| `creators.slug` | Optional URL-safe unique slug |
| `creator_id` on garments / analytics props | Links SKU interactions to the brand |
| Shop `products.brand` string | Legacy display name — **do not use for joins**; migrate shop SKUs onto `creator_id` |

## Monetization + Orbit business flow (proposed)

```
Member interactions (anonymized)
        ↓
MyYanga analytics_events
        ↓
Admin / Brand Insights packs (paid on MyYanga)
        ↓ export JSON / webhook
ZonicMe Orbit (brand login sees MyYanga + other portals rolled up by orbit_brand_key)
```

### Stack the money

| Layer | Who pays | What they get |
| --- | --- | --- |
| **A. Portal Insights (MyYanga)** | Brand / agency | Brand-scoped dashboard + AI asks; tiers: weekly digest / on-demand packs / API |
| **B. Promotion + Insights bundle** | Brand | Paid creator promotion + reel slots **plus** attribute/fit report on their SKUs |
| **C. Orbit Aggregate (ZonicMe)** | Brand group / holding | Cross-portal rollup (MyYanga + MyAfriart + …) under one Orbit brand ID; higher CPM / seat fee |
| **D. Operator cut** | — | MyYanga keeps portal SaaS revenue; Orbit takes network subscription + optional rev-share on pack exports |

### Pricing sketch (planning)

- **Starter Insights:** included with paid promotion, or ~₦25–40k/mo for brand seat  
- **Pro Insights:** AI asks + export + 90d history ~₦80–120k/mo  
- **Orbit Network:** +₦X/seat for multi-portal; brands map `myyanga:creator:12` → Orbit Brand UUID once  

### Product rules

1. Insights sold on **MyYanga alone** first (this studio).  
2. Export button / webhook ships packs to Orbit — **never raw PII**.  
3. Brands only see **their** `creator_id` unless they buy portal-wide (operator only).  
4. Later: `creators.orbit_brand_id` UUID for stable cross-portal identity.

## ZonicMe extraction (current build)

- Local/Testing queue + Admin Insights UI  
- Production: `analytics_events` + `admin_fashion_analytics`  
- Orbit pipe: **Export Orbit pack** JSON (webhook automation = next build)

