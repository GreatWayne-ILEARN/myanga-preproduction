import React, { useEffect, useState } from "react";
import { Data } from "./lib/dataBridge.js";
import { useAuth, useDbMode } from "./hooks.js";
import { DeleteControls } from "./components/DeleteControls.jsx";
import { ContentStudio } from "./components/ContentStudio.jsx";
import { MonetizationStudio } from "./components/MonetizationStudio.jsx";
import { AccessControlStudio } from "./components/AccessControlStudio.jsx";
import { profileHasPrivilege } from "./lib/accessControl.js";
import { VirtualWearPage } from "./pages/VirtualWearPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { ProductPage } from "./pages/ProductPage.jsx";
import { BagPage } from "./pages/BagPage.jsx";
import { EVettingStudio } from "./components/EVettingStudio.jsx";
import { bagCount, useBagTick } from "./lib/cartStore.js";
import { isBrandShopReady } from "./lib/commerce.js";
import { SiteAnalytics } from "./components/SiteAnalytics.jsx";
import { InsightsStudio } from "./components/InsightsStudio.jsx";
import { track, trackPageView, EV, aggregateFashionAnalytics, loadAnalyticsEvents, RETURN_REASONS } from "./lib/analytics.js";
import { SmartSearchPage } from "./pages/SmartSearchPage.jsx";
import { EventsPage } from "./pages/EventsPage.jsx";
import { PYLPage } from "./pages/PYLPage.jsx";
import { LookSharePage, shareCodeFromPath } from "./pages/LookSharePage.jsx";
import { BlogIndex, BlogArticle, BlogTeaser } from "./pages/BlogPage.jsx";
import LegalPage from "./pages/LegalPage.jsx";
import { listBlogPosts } from "./lib/blogPosts.js";
import { ReelsPage, ReelDeliveryDiagnostics } from "./pages/ReelsPage.jsx";
import { sendReelNow } from "./lib/reelEngine.js";
import { saveReelConfigOverride, loadReelConfigOverride } from "./lib/reelStore.js";
import { deleteSelectedRecords, deleteAllRecords } from "./lib/adminDelete.js";
import { consumePaymentReturn, verifyPaymentReturn } from "./lib/monetization.js";
import { supabase, hasSupabase } from "./lib/supabase.js";
import { isProduction } from "./lib/dataBridge.js";
import { PayGate } from "./components/PayGate.jsx";
import { getEditorial, saveEditorial, EDITORIAL_KINDS, KIND_TO_DB } from "./lib/editorial.js";
import { resizeForDevices } from "./lib/responsiveImage.js";
import { EXPLORE_THEMES, emptyMultiFilters } from "./lib/catalog.js";
import { RefineFilters } from "./components/RefineFilters.jsx";
import { matchGarment } from "./lib/catalog.js";
import { Pager, usePaged } from "./components/Pager.jsx";
import { usePerPage } from "./hooks/usePerPage.js";

/* ----------------------------- design system ----------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
:root{--maroon:#850713;--maroon-d:#4a040a;--cream:#F5F0E8;--ink:#1A1A1A;--gold:#C9A227;--line:#E6DFD3;--muted:#8A857C;--white:#fff;--radius:0}
*{box-sizing:border-box}html,body{margin:0;overflow-x:hidden;max-width:100%;font-family:'Raleway',sans-serif;color:var(--ink);background:var(--white);-webkit-text-size-adjust:100%}
button,input,select,textarea,.btn,.chip,.card,.panel,.look,.tick-box,.gender-btn,.thumb,.designer-card,.drop,.modal,.nav-toggle,.searchbar .btn-search,.vw-step,.page-link{border-radius:0!important;font-family:inherit}
.serif{font-family:'Playfair Display',serif}
a{color:inherit;text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 20px;width:100%;box-sizing:border-box}
main{overflow-x:hidden;min-width:0}
img{max-width:100%;height:auto}
button,.btn,.chip,.nav-toggle,.page-link,.settings-day,.settings-seg-btn,.gender-btn{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.muted{color:var(--muted)}
.eyebrow{font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--maroon)}
.btn{font-family:inherit;font-weight:800;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;padding:12px 22px;border:2px solid var(--maroon);background:var(--maroon);color:#fff;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;justify-content:center;line-height:1.2;position:relative;z-index:1}
.btn:hover{background:var(--maroon-d)}
.btn-ghost{background:transparent;color:var(--ink);border-color:var(--ink)}
.btn-ghost:hover{background:var(--ink);color:#fff}
.btn-gold{background:var(--gold);border-color:var(--gold);color:#1a1a1a}
/* PDP — Apple-minimal / Selfridges-complete */
.pdp{padding-bottom:48px}
.pdp-crumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px;color:var(--muted);padding:20px 20px 0;max-width:1200px;margin:0 auto}
.pdp-link{background:none;border:none;color:var(--maroon);font:inherit;font-weight:700;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}
.pdp-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;padding:28px 20px 40px;max-width:1200px;margin:0 auto;align-items:start}
@media(max-width:860px){.pdp-grid{grid-template-columns:1fr;gap:24px}}
.pdp-media{background:#f5f3ef;aspect-ratio:3/4;overflow:hidden}
.pdp-media img{width:100%;height:100%;object-fit:cover;display:block}
.pdp-brand{font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.pdp-title{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,40px);font-weight:600;margin:0 0 12px;line-height:1.15;letter-spacing:-.02em}
.pdp-price{font-size:22px;font-weight:700;margin:0 0 8px}
.pdp-meta{font-size:13px;color:var(--muted);margin:0 0 16px;text-transform:capitalize}
.pdp-trust{font-size:13px;line-height:1.45;color:var(--ink);margin:0 0 22px;max-width:36em}
.pdp-trust-warn{color:#7a4a00;background:#fff8e8;padding:12px 14px;border:1px solid #e8d5a8}
.pdp-block{margin-bottom:22px}
.pdp-label-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.pdp-label{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase}
.pdp-swatches,.pdp-sizes{display:flex;flex-wrap:wrap;gap:8px}
.pdp-swatch,.pdp-size{min-height:44px;min-width:52px;padding:10px 14px;border:1px solid #c8c4bc;background:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.pdp-swatch.on,.pdp-size.on{border-color:var(--ink);border-width:2px;padding:9px 13px}
.pdp-guide{margin-top:14px;padding:14px;background:#faf9f7;border:1px solid var(--line);font-size:12px}
.pdp-guide table{width:100%;border-collapse:collapse;margin:8px 0}
.pdp-guide td{padding:4px 8px 4px 0;border-bottom:1px solid var(--line)}
.pdp-actions{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 20px}
.pdp-bag-btn{min-width:200px;min-height:52px;font-size:13px;letter-spacing:1.5px}
.pdp-bullets{margin:0;padding:0 0 0 18px;color:var(--muted);font-size:13px;line-height:1.55}
.pdp-err{color:#b00020;font-size:13px;font-weight:700}
.pdp-flash{color:#0f6e63;font-size:13px;font-weight:700}
/* Bag — sparse Apple checkout summary */
.bag-head{padding-top:28px}
.bag-title{font-family:'Playfair Display',serif;font-size:clamp(32px,5vw,48px);font-weight:600;margin:8px 0 12px;letter-spacing:-.03em}
.bag-lead{max-width:42em;font-size:14px;line-height:1.5;color:var(--muted);margin:0 0 8px}
.bag-layout{display:grid;grid-template-columns:1.4fr .8fr;gap:40px;align-items:start}
@media(max-width:900px){.bag-layout{grid-template-columns:1fr}}
.bag-line{display:grid;grid-template-columns:96px 1fr auto;gap:16px;padding:20px 0;border-bottom:1px solid var(--line)}
.bag-line img{width:96px;height:120px;object-fit:cover;background:#eee}
.bag-brand{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:0 0 4px}
.bag-line-body h2{font-size:16px;font-weight:600;margin:0 0 6px;font-family:'Playfair Display',serif}
.bag-qty{display:flex;align-items:center;gap:10px;margin-top:12px}
.bag-qty button{width:32px;height:32px;border:1px solid var(--line);background:#fff;cursor:pointer;font-size:16px}
.bag-remove{border:none!important;width:auto!important;background:none!important;text-decoration:underline;font-size:12px!important;color:var(--muted);margin-left:8px}
.bag-line-price{font-weight:700;font-size:15px;white-space:nowrap}
.bag-summary{position:sticky;top:100px;padding:24px;background:#faf9f7;border:1px solid var(--line)}
.bag-summary h3{font-family:'Playfair Display',serif;font-size:22px;margin:0 0 16px;font-weight:600}
.bag-row{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:6px 0}
.bag-split-note{font-size:12px;color:var(--muted);line-height:1.4;margin:10px 0 16px}
.bag-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;font-size:12px;font-weight:700}
.bag-field input{font:inherit;font-weight:500;padding:12px;border:1px solid var(--line);background:#fff}
.bag-checkout{width:100%;min-height:52px;margin-bottom:10px}
.bag-empty{padding:48px 0;text-align:center}
.bag-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;background:var(--maroon);color:#fff;font-size:10px;font-weight:800;border-radius:9px}
.shop-card-hit{cursor:pointer;text-align:left;width:100%;border:none;padding:0;background:none;font:inherit}
.shop-badge{display:inline-block;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 6px;margin-top:6px;border:1px solid var(--line)}
.shop-badge.on{border-color:var(--maroon);color:var(--maroon);background:rgba(133,7,19,.06)}
.e-vet-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)}
.evet-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--line);margin-bottom:20px;max-height:280px;overflow:auto}
.evet-list-row{display:flex;justify-content:space-between;gap:12px;align-items:center;width:100%;text-align:left;padding:12px 14px;border:none;border-bottom:1px solid var(--line);background:#fff;cursor:pointer;font:inherit}
.evet-list-row:last-child{border-bottom:none}
.evet-list-row.on{background:#faf5f4}
.evet-list-row strong{display:block}
.evet-list-row em{font-style:normal;font-size:12px;color:var(--muted)}
.evet-badges{display:flex;flex-wrap:wrap;gap:6px}
.evet-badges i{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:4px 8px;border:1px solid var(--line);color:var(--muted)}
.evet-badges i.on{background:var(--maroon);color:#fff;border-color:var(--maroon)}
.evet-dossier{border:1px solid var(--line);padding:20px;background:#faf9f7}
.evet-dossier-h{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}
.evet-dossier-h h4{margin:4px 0 0;font-size:22px}
.evet-dossier-actions{display:flex;flex-wrap:wrap;gap:8px}
.evet-cac-snap{margin-bottom:16px;padding:14px;background:#fff;border:1px solid var(--line)}
.evet-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
@media(max-width:720px){.evet-grid{grid-template-columns:1fr}}
.evet-span-2{grid-column:1/-1}
.evet-ticks{display:flex;flex-direction:column;gap:10px;margin:16px 0}
.evet-id-preview{display:block;max-width:180px;margin-top:8px;border:1px solid var(--line)}

.btn-danger{background:#b00020;border-color:#b00020}.btn-danger:hover{background:#8a0019}
.btn-danger-soft{background:#fff;color:#b00020;border-color:#b00020}
.link-danger{background:none;border:none;color:#b00020;font-size:12px;cursor:pointer;font-weight:700}
.btn:disabled{opacity:.5;cursor:not-allowed}
.action-row{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:stretch}
.action-row .btn{min-height:44px}
/* bold rectangular tick boxes */
.refine-panel{display:flex;flex-direction:column;gap:16px}
.tick-group{border:2px solid var(--line);padding:12px;background:#fff}
.tick-label{font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--maroon);margin-bottom:10px}
.tick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.tick-box{display:flex;align-items:center;gap:8px;border:2px solid var(--ink);padding:10px 12px;min-height:44px;cursor:pointer;background:#fff;font-size:12px;font-weight:700;user-select:none;margin:0}
.tick-box input{position:absolute;opacity:0;pointer-events:none}
.tick-mark{width:18px;height:18px;border:2px solid var(--ink);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;line-height:1;background:#fff;color:var(--maroon)}
.tick-box.on{border-color:var(--maroon);background:rgba(133,7,19,.06)}
.tick-box.on .tick-mark{background:var(--maroon);border-color:var(--maroon);color:#fff}
.tick-box.disabled{opacity:.45;pointer-events:none}
.tick-box.promo{margin-top:4px;max-width:360px}
.tick-text{line-height:1.25}
.refine-hint{font-size:12px;color:var(--muted);margin:8px 0 0}
/* virtual wear — rectangular, equal controls, no overlap */
.vw-section{margin:16px 0 20px;position:relative;z-index:0}
.vw-section-h{font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--maroon);margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--line)}
.thumb-row{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 10px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.thumb{flex:0 0 120px;width:120px;height:210px;scroll-snap-align:start;border:2px solid var(--line);background:#fff;padding:0;cursor:pointer;text-align:left;display:flex;flex-direction:column;font-family:inherit;box-sizing:border-box;overflow:hidden;flex-shrink:0;position:relative;z-index:0}
.thumb img{width:100%;height:148px;object-fit:cover;display:block;background:#111;flex-shrink:0}
.thumb span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;padding:6px 8px 0;font-size:11px;font-weight:700;line-height:1.25;color:var(--ink);height:32px;box-sizing:border-box}
.thumb em{display:block;padding:2px 8px 8px;font-style:normal;font-size:11px;font-weight:800;color:var(--maroon);margin-top:auto}
.thumb.on{border-color:var(--maroon);border-width:3px;z-index:1}
.thumb:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.designer-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.designer-card{border:2px solid var(--line);background:#fff;padding:14px;cursor:pointer;text-align:left;font-family:inherit;display:flex;flex-direction:column;gap:4px;min-height:96px;height:100%;box-sizing:border-box}
.designer-card strong{font-size:14px;line-height:1.2}.designer-card span{font-size:11px;color:var(--muted)}.designer-card em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-top:auto}
.designer-card.on{border-color:var(--maroon);border-width:3px;background:rgba(133,7,19,.05)}
.vw-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;margin-top:14px}
.vw-actions .btn,.vw-actions a.btn{min-height:44px;min-width:148px;padding:12px 18px;box-sizing:border-box;flex:0 1 auto;text-decoration:none}
.vw-actions .btn-sm,.vw-actions a.btn-sm{min-height:40px;min-width:120px;padding:10px 14px;font-size:11px}
.vw-steps{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.vw-step{display:inline-flex;align-items:center;min-height:32px;padding:6px 10px;border:1px solid var(--line);font-size:11px;font-weight:700;letter-spacing:.5px;color:var(--muted);background:#fff}
.vw-step.on{border-color:var(--maroon);color:var(--maroon);background:rgba(133,7,19,.06)}
.gender-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:360px}
.gender-btn{border:2px solid var(--ink);background:#fff;min-height:52px;width:100%;font-family:inherit;font-weight:800;font-size:14px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;box-sizing:border-box}
.gender-btn.on{background:var(--maroon);border-color:var(--maroon);color:#fff}
.vw-result{display:grid;gap:20px;max-width:920px}
@media(min-width:800px){.vw-result{grid-template-columns:minmax(280px,480px) 1fr;align-items:start}}
.vw-link-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px}
.vw-share-url{font-size:12px;word-break:break-all;color:var(--maroon);font-weight:700;cursor:pointer;text-decoration:underline}
/* member settings — sleek identity + reel schedule */
.settings-hero{background:linear-gradient(145deg,#1a0a0c 0%,#3a1218 42%,#850713 100%);color:#f0d9b8;padding:36px 0 42px;margin-bottom:0;position:relative;overflow:hidden}
.settings-hero:after{content:"";position:absolute;inset:auto -20% -40% auto;width:55%;height:120%;background:radial-gradient(circle,rgba(201,162,39,.22),transparent 70%);pointer-events:none}
.settings-title{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,40px);margin:8px 0 6px;color:#fff;font-weight:700}
.settings-lead{max-width:520px;font-size:14px;line-height:1.55;opacity:.88;margin:0}
.settings-flash{display:inline-block;margin-top:14px;padding:8px 14px;background:rgba(201,162,39,.2);border:1px solid rgba(201,162,39,.55);color:#f5e6b8;font-size:12px;font-weight:700;letter-spacing:.5px}
.settings-body{padding-top:28px!important;background:linear-gradient(180deg,#f7f3ec 0%,#fff 48%)}
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start}
@media(max-width:860px){.settings-grid{grid-template-columns:1fr}}
.settings-card{background:#fff;border:1px solid var(--line);padding:26px 24px 22px;box-shadow:0 12px 40px rgba(26,10,12,.04)}
.settings-card-accent{border-color:rgba(133,7,19,.25);background:linear-gradient(180deg,#fffefb,#fff)}
.settings-card-h{margin-bottom:18px}
.settings-kicker{display:block;font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:var(--maroon);margin-bottom:6px}
.settings-card-h h2{font-family:'Playfair Display',serif;font-size:24px;margin:0 0 6px;font-weight:700}
.settings-card-h p{margin:0;font-size:13px;color:var(--muted);line-height:1.5;max-width:420px}
.settings-fields{display:flex;flex-direction:column;gap:12px}
.settings-field{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}
.settings-field input,.settings-field select,.settings-field textarea{font-family:inherit;font-size:14px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink);padding:12px 14px;border:1px solid var(--line);background:#faf8f5;width:100%;box-sizing:border-box}
.settings-field input:focus,.settings-field select:focus,.settings-field textarea:focus{outline:2px solid rgba(133,7,19,.35);outline-offset:0;background:#fff}
.settings-row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:520px){.settings-row-2{grid-template-columns:1fr}}
.settings-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.settings-channels{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
@media(max-width:520px){.settings-channels{grid-template-columns:1fr}}
.settings-channel{display:flex;align-items:flex-start;gap:10px;text-align:left;padding:12px;border:2px solid var(--line);background:#fff;cursor:pointer;font-family:inherit}
.settings-channel.on{border-color:var(--maroon);background:rgba(133,7,19,.05)}
.settings-channel-dot{width:12px;height:12px;margin-top:3px;border:2px solid var(--ink);flex-shrink:0}
.settings-channel.on .settings-channel-dot{background:var(--maroon);border-color:var(--maroon)}
.settings-channel strong{display:block;font-size:13px;font-weight:800;color:var(--ink)}
.settings-channel em{display:block;font-style:normal;font-size:11px;color:var(--muted);margin-top:2px;line-height:1.35}
.settings-seg{display:flex;gap:0;margin-bottom:14px;border:1px solid var(--line)}
.settings-seg-btn{flex:1;min-height:42px;border:0;border-right:1px solid var(--line);background:#fff;font-family:inherit;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;cursor:pointer}
.settings-seg-btn:last-child{border-right:0}
.settings-seg-btn.on{background:var(--maroon);color:#fff}
.settings-days{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px}
.settings-day{min-width:44px;min-height:40px;padding:8px 10px;border:2px solid var(--line);background:#fff;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer}
.settings-day.on{border-color:var(--maroon);background:var(--maroon);color:#fff}
.explore-dark{background:#141414;color:#e8d9a8;padding:28px 0 40px}
.explore-nav{display:flex;flex-wrap:wrap;gap:0;border-bottom:1px solid rgba(201,162,39,.45);margin-bottom:22px}
.explore-nav button{flex:1 1 auto;min-width:120px;background:transparent;border:0;border-bottom:2px solid transparent;color:#c9a227;font-family:inherit;font-weight:800;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 10px;cursor:pointer;margin-bottom:-1px}
.explore-nav button.on{border-bottom-color:#c9a227;color:#fff}
.theme-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
@media(max-width:980px){.theme-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.theme-grid{grid-template-columns:1fr}}
.theme-pane{position:relative;min-height:160px;border:2px solid rgba(201,162,39,.35);padding:18px;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;text-align:left;font-family:inherit;color:#f0d9b8}
.theme-pane:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 20%,rgba(0,0,0,.65));pointer-events:none}
.theme-pane > *{position:relative;z-index:1}
.theme-pane h3{margin:0;font-size:13px;font-weight:800;letter-spacing:2px}
.theme-pane p{margin:6px 0 0;font-size:11px;opacity:.85}
/* numbered page breaks — match live myyanga.com Shop (‹ 1 2 3 ›) */
.pager{display:flex;flex-direction:column;align-items:center;margin:28px 0 8px;gap:8px}
.pagination{display:flex;flex-wrap:wrap;gap:0;list-style:none;margin:0;padding:0}
.page-item{margin:0}
.page-link{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;padding:6px 12px;border:1px solid #dee2e6;background:#fff;color:var(--maroon);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;line-height:1;border-radius:0!important}
.page-item + .page-item .page-link{margin-left:-1px}
.page-item.active .page-link{background:var(--maroon);border-color:var(--maroon);color:#fff;cursor:default}
.page-item.disabled .page-link{color:#6c757d;cursor:default;background:#fff;pointer-events:none}
.page-item:not(.disabled):not(.active) .page-link:hover{background:rgba(133,7,19,.06)}
.pager-meta{text-align:center;font-size:12px;color:var(--muted);font-weight:600}
@media(max-width:560px){.page-link{min-width:32px;height:32px;padding:4px 10px;font-size:13px}}
/* sticky site header: logo/nav + search options bar */
.site-header{position:sticky;top:0;z-index:40;background:#fff;border-bottom:1px solid var(--line);box-shadow:0 1px 0 rgba(0,0,0,.03)}
.logobar{background:#fff}
.logobar .row{display:flex;align-items:center;justify-content:space-between;min-height:62px;height:auto;padding:8px 0;gap:10px}
.logo{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;flex-shrink:0;line-height:0}.logo b{color:var(--maroon)}
.logo-img{height:44px;width:auto;display:block;max-width:140px}
.nav{display:flex;gap:18px;align-items:center;flex:1;justify-content:center;flex-wrap:wrap}
.nav a{font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}.nav a:hover{color:var(--maroon)}
.nav a.active{color:var(--maroon)}
.hdr-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}
.hdr-user{font-size:12px;color:var(--muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-hdr{padding:8px 14px;min-height:36px;font-size:11px;letter-spacing:1px;white-space:nowrap;flex-shrink:0}
.nav-toggle{display:none;border:2px solid var(--ink);background:#fff;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;min-height:36px;white-space:nowrap}
.nav-drawer{display:none;border-top:1px solid var(--line);background:#fff;padding:10px 0 14px}
.nav-drawer.open{display:block}
.nav-drawer a{display:block;padding:12px 0;font-size:14px;font-weight:600;cursor:pointer;border-bottom:1px solid var(--line)}
.nav-drawer a.active{color:var(--maroon)}
.nav-drawer .drawer-auth{padding-top:12px;display:flex;flex-direction:column;gap:8px}
@media(min-width:821px){
  .nav-drawer .drawer-auth{display:none}
}
@media(max-width:820px){
  .nav{display:none}
  .nav-toggle{display:inline-flex;align-items:center}
  .hdr-user{display:none}
  .hdr-actions .btn-hdr{display:none}
  .logo-img{height:36px;max-width:110px}
  .logobar .row{min-height:56px;padding:6px 0}
  .btn,.chip,.nav-drawer a,.foot a{min-height:44px}
  .nav-drawer a{display:flex;align-items:center}
  .admin-side{display:flex;flex-wrap:wrap;gap:0;padding:8px}
  .admin-side a{flex:1 1 40%;min-height:44px;border-left:0!important;border-bottom:1px solid rgba(255,255,255,.08)}
  .admin-main{padding:16px;min-width:0;overflow-x:auto}
  .pdp-title,.bag-title,.settings-title,.page-head h1{word-wrap:break-word}
  .modal{width:min(420px,94vw);max-height:90vh;overflow-y:auto}
  .bag-summary{position:static}
}
@media(max-width:560px){
  .hero .in{padding:48px 0}
  .hero .cta-row{flex-direction:column;align-items:stretch}
  .hero .cta-row .btn{width:100%}
  .searchbar .row{flex-direction:column;align-items:stretch}
  .searchbar .qwrap{flex:1 1 auto;width:100%}
  .searchbar select{flex:1 1 auto;width:100%;min-width:0}
  .searchbar .btn-search{flex:1 1 auto;width:100%}
  .dbtoggle{left:10px;right:auto;bottom:10px;max-width:calc(100vw - 20px);font-size:10px;padding:7px 9px;gap:6px}
  .dbtoggle button{padding:4px 8px;font-size:10px}
  .foot{grid-template-columns:1fr}
}
.searchbar{background:linear-gradient(90deg,#851113,#6b0a0e 55%,#9a3a12);border-top:1px solid rgba(255,255,255,.08)}
.searchbar .row{display:flex;align-items:stretch;gap:8px;padding:10px 0;flex-wrap:wrap}
.searchbar .qwrap{flex:1 1 220px;min-width:0;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.35);padding:0 12px;min-height:42px}
.searchbar .qwrap input{flex:1;border:0;outline:none;background:transparent;font-family:inherit;font-size:14px;min-width:0}
.searchbar .qwrap .ico{color:var(--muted);font-size:14px;flex-shrink:0}
.searchbar select{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.14);color:#fff;font-family:inherit;font-size:12px;font-weight:600;padding:0 10px;min-height:42px;min-width:120px;cursor:pointer}
.searchbar select option{color:var(--ink);background:#fff}
.searchbar .btn-search{flex-shrink:0;min-height:42px;padding:0 18px;border:1px solid var(--gold);background:var(--gold);color:#1a1a1a;font-weight:800;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
.searchbar .btn-search:hover{filter:brightness(1.05)}
.hero .cta-row{margin-top:26px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.hero{background:var(--maroon);color:#fff;position:relative;overflow:hidden}
.hero:before{content:"";position:absolute;inset:0;background:radial-gradient(700px 350px at 85% -10%,rgba(184,137,58,.4),transparent)}
.hero .in{position:relative;padding:70px 0;text-align:center}
.hero h1{font-family:'Playfair Display',serif;font-size:clamp(32px,6vw,56px);line-height:1.05;font-weight:700}
.hero .tag{margin-top:14px;letter-spacing:4px;font-size:12px;font-weight:700;text-transform:uppercase;color:#f0d9b8}
.section{padding:54px 0}
.sec-head{text-align:center;margin-bottom:30px}
.sec-head h2{font-family:'Playfair Display',serif;font-size:clamp(24px,4vw,38px);margin:6px 0 0}
.grid{display:grid;gap:18px}
.g5{grid-template-columns:repeat(5,1fr)}.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g2{grid-template-columns:repeat(2,1fr)}
@media(max-width:980px){.g5,.g4{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.g5,.g4,.g3,.g2{grid-template-columns:1fr}}
.card{border:1px solid var(--line);background:#fff;cursor:pointer;transition:.15s;overflow:hidden}
.card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}
.img{display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;color:#fff;font-size:34px;aspect-ratio:3/4}
.card .meta{padding:12px}.card .t{font-weight:700;font-size:13px}.card .b{font-size:11px;color:var(--muted)}.card .p{font-weight:800;margin-top:6px;font-size:13px}
.editorial{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:820px){.editorial{grid-template-columns:1fr}}
.blog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
@media(max-width:900px){.blog-grid{grid-template-columns:1fr}}
.blog-card{cursor:pointer;border:1px solid var(--line);background:var(--white);transition:border-color .15s,transform .15s;display:flex;flex-direction:column}
.blog-card:hover{border-color:var(--maroon);transform:translateY(-2px)}
.blog-thumb{aspect-ratio:16/10;overflow:hidden;background:var(--maroon-d)}
.blog-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.blog-card-meta{padding:16px 18px 20px;flex:1;display:flex;flex-direction:column}
.blog-card-meta h3{font-size:20px;margin:8px 0 10px;line-height:1.25;color:var(--ink)}
.blog-excerpt{font-size:13px;line-height:1.55;color:var(--muted);margin:0 0 12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.blog-more{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--maroon);margin-top:auto}
.blog-body p{font-size:16px;line-height:1.75;margin:0 0 1.15em;color:var(--ink)}
.blog-actions{display:flex;flex-wrap:wrap;gap:10px;margin:28px 0 8px}
.blog-comments{margin-top:28px}
.blog-comment{border-bottom:1px dashed var(--line);padding:10px 0}
.blog-comment-meta{font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px}
.blog-explore-cta{text-align:center;padding:36px 16px 8px;border-top:1px solid var(--line);margin-top:28px}
.blog-explore-cta .serif{font-size:22px;margin:0 0 16px;color:var(--maroon)}
.edcard{border:1px solid var(--line)}.edcard .meta{padding:14px;display:flex;justify-content:space-between;align-items:flex-end}
.edcard .label{font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--maroon)}
.edcard h4{font-family:'Playfair Display',serif;font-size:18px;margin:4px 0 0}
.catwrap{margin-bottom:22px}.catwrap h3{font-family:'Playfair Display',serif;color:var(--maroon);border-bottom:2px solid var(--line);padding-bottom:6px;font-size:18px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.chip{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;border:2px solid var(--ink);background:var(--cream);cursor:pointer;display:inline-flex;align-items:center;min-height:40px}.chip:hover{background:var(--ink);color:#fff}.chip.on{background:var(--maroon);border-color:var(--maroon);color:#fff}
.page-head{padding:36px 0 6px}.page-head h1{font-family:'Playfair Display',serif;font-size:clamp(26px,5vw,42px)}.crumbs{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
.lead{color:#4a463d;max-width:680px;margin-top:8px}
.field{margin-bottom:12px}.field label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px}
.field input,.field select{width:100%;padding:11px 13px;border:1px solid var(--line);font-family:inherit;font-size:14px;background:#fff}
.panel{border:1px solid var(--line);padding:20px;background:var(--cream)}
.drop{border:2px dashed var(--line);padding:30px;text-align:center;background:var(--cream);cursor:pointer}
.look{border:1px solid var(--line);padding:0;overflow:hidden}
.look .head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--ink);color:#fff}
.look .items{padding:12px 14px}.look .it{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px dashed var(--line)}
.look .tot{display:flex;justify-content:space-between;font-weight:800;padding-top:10px}
/* admin */
.admin{display:grid;grid-template-columns:210px 1fr;gap:0;min-height:70vh}
@media(max-width:820px){.admin{grid-template-columns:1fr}}
.admin-side{background:var(--ink);color:#cfc9bf;padding:18px 0}
.admin-side a{display:block;padding:11px 20px;font-size:13px;font-weight:600;cursor:pointer}
.admin-side a:hover,.admin-side a.active{background:rgba(255,255,255,.08);color:#fff;border-left:3px solid var(--gold)}
.admin-main{padding:24px}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}@media(max-width:680px){.kpis{grid-template-columns:repeat(2,1fr)}}
.kpi{border:1px solid var(--line);padding:18px}.kpi .v{font-size:26px;font-weight:800}.kpi .l{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
.del-rows{border:1px solid var(--line)}.del-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line);font-size:13px}.del-row span{flex:1}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:80}
.modal{background:#fff;padding:24px;max-width:420px;width:90%}.modal input{width:100%;padding:10px;border:1px solid var(--line);margin-top:10px}
footer{background:var(--ink);color:#cfc9bf;margin-top:30px}
.foot{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:24px;padding:46px 0 24px}@media(max-width:760px){.foot{grid-template-columns:1fr 1fr}}
.foot h5{color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}.foot a{display:block;padding:3px 0;font-size:13px;cursor:pointer}
.foot-b{border-top:1px solid rgba(255,255,255,.12);padding:14px 0;font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px}
.dbtoggle{position:fixed;left:16px;bottom:16px;z-index:90;background:var(--ink);color:#fff;border-radius:0;padding:8px 14px;display:flex;gap:8px;align-items:center;font-size:12px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.dbtoggle button{background:var(--gold);border:2px solid var(--gold);color:#1a1a1a;font-weight:800;padding:5px 10px;border-radius:0;cursor:pointer;font-size:11px}
.carousel{position:relative}.slide{position:relative;border:1px solid var(--line);overflow:hidden;background:#000}.slide-img{width:100%;height:clamp(320px,52vh,560px);object-fit:cover;display:block}.slide-overlay{position:absolute;left:0;right:0;bottom:0;padding:26px 24px;background:linear-gradient(to top,rgba(0,0,0,.8),rgba(0,0,0,.15),transparent);color:#fff}.slide-kind{font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--gold)}.slide-title{font-size:clamp(24px,4vw,40px);margin:4px 0 2px}.slide-creator{font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:12px;opacity:.9}.slide-desc{max-width:680px;margin-top:10px;font-size:14px;line-height:1.6}.car-arrow{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.4);color:#fff;border:none;font-size:30px;width:46px;height:46px;cursor:pointer;line-height:1}.car-arrow:hover{background:var(--maroon)}.car-arrow.left{left:10px}.car-arrow.right{right:10px}.car-dots{display:flex;gap:7px;justify-content:center;margin-top:14px}.dot{width:9px;height:9px;border-radius:0;background:var(--line);cursor:pointer}.dot.on{background:var(--maroon);width:22px}
.cs-banner{border:1px solid var(--maroon);background:rgba(133,7,19,.06);padding:10px 12px;font-size:13px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}\n.cs-pill{background:var(--maroon);color:#fff;font-size:10px;font-weight:800;padding:4px 8px;letter-spacing:1px}\n.cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:820px){.cs-grid{grid-template-columns:1fr}}\n.cs-publish{position:sticky;bottom:0;border:1px solid var(--line);background:#fff;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px}\n.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:11px 18px;font-size:13px;font-weight:600;z-index:95;opacity:0;transition:.25s;pointer-events:none}
.toast.show{opacity:1}
`;
function useStyle() { useEffect(() => { const el = document.createElement("style"); el.textContent = CSS; document.head.appendChild(el); return () => el.remove(); }, []); }
function useAsync(fn, deps = []) { const [v, setV] = useState(null); useEffect(() => { let on = true; Promise.resolve(fn()).then((d) => on && setV(d)); return () => { on = false; }; }, deps); return v; }
const naira = (n) => "₦" + Number(n || 0).toLocaleString();
const Img = ({ img, style }) => {
  if (!img) return <div className="img" style={{ background: "#e8e4df", ...style }}>?</div>;
  return <div className="img" style={{ background: `linear-gradient(135deg,${img.c1},${img.c2})`, ...style }}>{img.t}</div>;
};
let toastTimer;
if (typeof window !== "undefined") window.__toast = (m) => toast(m);
function toast(msg) { let t = document.getElementById("__toast"); if (!t) { t = document.createElement("div"); t.id = "__toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400); }

/* --------------------------------- pages --------------------------------- */
function ProductCard({ p, onOpen }) {
  return <div className="card" onClick={onOpen}><Img img={p.img} /><div className="meta"><div className="t">{p.name}</div><div className="b">by {p.brand}</div><div className="p">{naira(p.price)}</div></div></div>;
}

function Carousel({ go }) {
  const list = useAsync(() => Data.editorialCarousel(), []) || getEditorial();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => { const t = setInterval(() => { setI((x) => (x + 1) % list.length); setOpen(false); }, 5000); return () => clearInterval(t); }, [list.length]);
  if (!list.length) return null;
  const s = list[i];
  const move = (d) => { setI((x) => (x + d + list.length) % list.length); setOpen(false); };
  return (
    <div className="carousel">
      <div className="slide">
        {s.image ? <img src={s.image} alt="" className="slide-img" />
          : <div className="slide-img" style={{ background: `linear-gradient(135deg,${s.img.c1},${s.img.c2})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontSize: 80, color: "#fff" }}>{s.img.t}</div>}
        <div className="slide-overlay">
          <div className="slide-kind">{s.kind}</div>
          <h3 className="serif slide-title">{s.title}</h3>
          <div className="slide-creator">{s.creator}</div>
          {open && <p className="slide-desc">{s.description}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-gold" onClick={() => setOpen((o) => !o)}>{open ? "Hide details" : "Reveal details"}</button>
            <button className="btn btn-ghost" style={{ borderColor: "#fff", color: "#fff" }} onClick={() => go(s.link === "/shop" ? "shop" : "discover")}>See more</button>
          </div>
        </div>
        <button className="car-arrow left" onClick={() => move(-1)} aria-label="Previous">‹</button>
        <button className="car-arrow right" onClick={() => move(1)} aria-label="Next">›</button>
      </div>
      <div className="car-dots">{list.map((_, idx) => <span key={idx} className={"dot" + (idx === i ? " on" : "")} onClick={() => { setI(idx); setOpen(false); }} />)}</div>
    </div>
  );
}

function Home({ go, openBrowse }) {
  const ed = Data.editorialMap();
  const cats = Data.categories();
  const products = useAsync(() => Data.products(), []) || [];
  return (
    <>
      <section className="hero"><div className="wrap in">
        <h1>The Best of African<br />Fashion, in one spot.</h1>
        <div className="tag">● Explore ● Shop ● Win</div>
        <div className="cta-row">
          <button className="btn btn-gold" onClick={() => go("virtualwear")}>Try Virtual Wear</button>
          <button className="btn btn-ghost" style={{ borderColor: "#fff", color: "#fff" }} onClick={() => go("shop")}>Shop now</button>
        </div>
      </div></section>

      <section className="section"><div className="wrap">
        <div className="sec-head"><div className="eyebrow">This week on MyYanga</div><h2>Editorial Spotlights</h2></div>
        <Carousel go={go} />
      </div></section>

      <section className="section" style={{ background: "var(--cream)" }}><div className="wrap">
        <div className="sec-head"><div className="eyebrow">Browse</div><h2>Explore by Category</h2></div>
        {Object.entries(cats).map(([g, arr]) => {
          const gender = g.startsWith("HER") ? "female" : g.startsWith("HIS") ? "male" : "";
          return (
            <div className="catwrap" key={g}>
              <h3>{g}</h3>
              <div className="chips">
                {arr.map((c) => (
                  <button
                    type="button"
                    className="chip"
                    key={c}
                    onClick={() =>
                      openBrowse({
                        gender: gender || undefined,
                        categories: gender ? [c] : [],
                        query: gender ? "" : c,
                      })
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div></section>

      <section className="section"><div className="wrap">
        <div className="sec-head"><div className="eyebrow">Featured</div><h2>From the Shop</h2></div>
        <div className="grid g4">{products.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} onOpen={() => go("shop")} />)}</div>
        <div style={{ textAlign: "center", marginTop: 24 }}><button className="btn" onClick={() => go("shop")}>Go to shop</button></div>
      </div></section>

      <BlogTeaser go={go} limit={3} eyebrow="Blog" title="Trending in fashion & creative economies" />

      <section className="section" style={{ background: "var(--maroon)", color: "#fff", textAlign: "center" }}><div className="wrap">
        <div className="eyebrow" style={{ color: "#f0d9b8" }}>Members</div>
        <h2 className="serif" style={{ fontSize: 32, margin: "8px 0 16px" }}>Join MyYanga Premium</h2>
        <button className="btn btn-gold" onClick={() => go("premium")}>View Premium</button>
      </div></section>
    </>
  );
}

function Explore({ openBrowse, go }) {
  const cats = Data.categories();
  const [theme, setTheme] = useState("her");
  const active = EXPLORE_THEMES.find((t) => t.id === theme) || EXPLORE_THEMES[0];
  const groupKey = active.label;
  const list = cats[groupKey] || cats["HER FASHION"] || [];

  return (
    <>
      <div className="explore-dark">
        <div className="wrap page-head" style={{ paddingTop: 28 }}>
          <div className="crumbs" style={{ color: "rgba(232,217,168,.55)" }}>Home / Explore</div>
          <h1 style={{ color: "#f0d9b8" }}>Explore</h1>
          <p className="lead" style={{ color: "rgba(232,217,168,.8)" }}>
            Dark-tinted theme panes — His / Hers first, then drill into categories. Every link opens Smart Search with
            those filters already ticked.
          </p>
        </div>
        <div className="wrap">
          <div className="explore-nav">
            {EXPLORE_THEMES.map((t) => (
              <button key={t.id} type="button" className={theme === t.id ? "on" : ""} onClick={() => setTheme(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="theme-grid">
            {EXPLORE_THEMES.map((t) => (
              <button
                type="button"
                key={t.id}
                className="theme-pane"
                style={{ background: `linear-gradient(145deg, ${t.tint}, #0a0a0a 70%)` }}
                onClick={() => {
                  setTheme(t.id);
                  if (t.gender) openBrowse({ gender: t.gender });
                  else go("discover");
                }}
              >
                <h3>{t.label}</h3>
                <p>{t.gender ? `Browse ${t.gender === "male" ? "His" : "Hers"}` : "Open Discover"}</p>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <h3 style={{ color: "#c9a227", letterSpacing: 2, fontSize: 13 }}>{groupKey}</h3>
            <div className="chips" style={{ marginTop: 12 }}>
              {list.map((c) => (
                <button
                  type="button"
                  className="chip"
                  key={c}
                  style={{ background: "transparent", color: "#e8d9a8", borderColor: "rgba(201,162,39,.55)" }}
                  onClick={() =>
                    openBrowse({
                      gender: active.gender || undefined,
                      categories: active.gender ? [c] : [],
                      query: active.gender ? "" : c,
                    })
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-gold" onClick={() => go("premium")}>
                View Premium
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Shop({ browseSeed, go }) {
  const products = useAsync(() => Data.products(), []) || [];
  const garments = useAsync(() => Data.garments(), []) || [];
  const creatorList = useAsync(() => Data.creators(), []) || [];
  const byId = Object.fromEntries((creatorList || []).map((c) => [c.id, c]));
  const [filters, setFilters] = useState(() => ({ ...emptyMultiFilters(), ...(browseSeed || {}) }));
  useEffect(() => {
    if (browseSeed) setFilters((f) => ({ ...emptyMultiFilters(), ...f, ...browseSeed }));
  }, [browseSeed]);
  const filtered = filters.gender
    ? garments.filter((g) => matchGarment(g, filters))
    : garments;
  const shopPer = usePerPage("shop");
  const productPer = usePerPage("shop_products");
  const catalogue = usePaged(filtered, shopPer);
  const productPage = usePaged(products, productPer);

  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">Home / Shop</div>
        <h1>Shop</h1>
        <p className="lead">
          Shoppable pieces from e-vetted African designers. Cart unlocks after e-vetting — checkout settles via
          Flutterwave / Paystack to the brand, with MyYanga commission split at the gateway. {catalogue.total} match
          {filters.gender ? ` · page ${catalogue.page} of ${catalogue.totalPages}` : ""}.
        </p>
      </div>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="panel" style={{ marginBottom: 20 }}>
            <RefineFilters filters={filters} setFilters={setFilters} />
          </div>
          {!filters.gender && (
            <p className="muted" style={{ marginBottom: 16 }}>
              Pick His or Hers to refine — page size is set in Content Studio (currently {shopPer} per break).
            </p>
          )}
          <div className="grid g4">
            {catalogue.slice.map((g) => {
              const c = byId[g.creator_id];
              const ready = isBrandShopReady(c);
              return (
                <button
                  type="button"
                  key={g.id}
                  className="shop-card-hit"
                  onClick={() => go("product", { garmentId: g.id })}
                >
                  <div className="card">
                    <img src={g.image} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} />
                    <div className="meta">
                      <div className="eyebrow" style={{ marginBottom: 4 }}>
                        {g.part === "main_outfit" ? "Outfit" : g.part === "shoes" ? "Shoes" : g.part === "bag" ? "Bag" : g.part}
                      </div>
                      <div className="t">{g.name}</div>
                      <div className="b">{g.creator?.name} · {g.country}</div>
                      <div className="p">{naira(g.price_ngn)}</div>
                      <span className={"shop-badge" + (ready ? " on" : "")}>{ready ? "E-vetted · Cart open" : "Browse only"}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <Pager page={catalogue.page} totalPages={catalogue.totalPages} onChange={catalogue.setPage} />
          {catalogue.totalPages > 1 && (
            <p className="pager-meta">
              Showing {(catalogue.page - 1) * catalogue.perPage + 1}–
              {Math.min(catalogue.page * catalogue.perPage, catalogue.total)} of {catalogue.total}
            </p>
          )}

          <div className="sec-head" style={{ marginTop: 36 }}>
            <div className="eyebrow">Also in shop</div>
            <h2>Product cards</h2>
          </div>
          <div className="grid g4">
            {productPage.slice.map((p) => (
              <ProductCard key={p.id} p={p} onOpen={() => go("shop")} />
            ))}
          </div>
          <Pager page={productPage.page} totalPages={productPage.totalPages} onChange={productPage.setPage} />
        </div>
      </section>
    </>
  );
}

function SmartSearch({ seed, seedKey, go }) {
  return <SmartSearchPage seed={seed} seedKey={seedKey} go={go} />;
}

const HEADER_SEARCH_DEFAULT = {
  query: "",
  gender: "",
};

function SiteHeader({
  view,
  go,
  navItems,
  isAdmin,
  profile,
  logout,
  onLogin,
  search,
  setSearch,
  onSearch,
  bagN,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = (k) => {
    setMenuOpen(false);
    go(k);
  };
  const submit = (e) => {
    e?.preventDefault?.();
    onSearch();
    setMenuOpen(false);
  };
  const showSearch = view !== "admin";
  return (
    <header className="site-header">
      <div className="logobar">
        <div className="wrap row">
          <span className="logo" onClick={() => navigate("home")} style={{ cursor: "pointer" }} title="MyYanga home">
            <img className="logo-img" src="/logo.svg" alt="MyYanga" width="140" height="44" />
          </span>
          <nav className="nav">
            {navItems.map(([k, l]) => (
              <a key={k} className={view === k || (k === "blog" && view === "article") ? "active" : ""} onClick={() => navigate(k)}>
                {l}
              </a>
            ))}
            {isAdmin && (
              <a className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}>
                Admin
              </a>
            )}
          </nav>
          <div className="hdr-actions">
            <button type="button" className="nav-toggle" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? "Close" : "Menu"}
            </button>
            <button type="button" className="btn btn-ghost btn-hdr" onClick={() => navigate("bag")} aria-label="Bag">
              Bag{bagN > 0 ? <span className="bag-badge">{bagN}</span> : null}
            </button>
            {profile ? (
              <>
                <span className="hdr-user" title={profile.name || profile.email}>
                  {profile.name || profile.email}
                </span>
                <button type="button" className="btn btn-ghost btn-hdr" onClick={() => navigate("settings")}>
                  Settings
                </button>
                <button type="button" className="btn btn-ghost btn-hdr" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-hdr" onClick={() => navigate("settings")}>
                  Settings
                </button>
                <button type="button" className="btn btn-hdr" onClick={onLogin}>
                  Login
                </button>
              </>
            )}
          </div>
        </div>
        <div className={`wrap nav-drawer${menuOpen ? " open" : ""}`}>
          {navItems.map(([k, l]) => (
            <a key={k} className={view === k || (k === "blog" && view === "article") ? "active" : ""} onClick={() => navigate(k)}>
              {l}
            </a>
          ))}
          {isAdmin && (
            <a className={view === "admin" ? "active" : ""} onClick={() => navigate("admin")}>
              Admin
            </a>
          )}
          <div className="drawer-auth">
            <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={() => navigate("settings")}>
              Settings
            </button>
            {profile ? (
              <>
                <span className="muted" style={{ fontSize: 12 }}>
                  Signed in as {profile.name || profile.email}
                </span>
                <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <button type="button" className="btn" style={{ width: "100%" }} onClick={onLogin}>
                Login / Sign-up
              </button>
            )}
          </div>
        </div>
      </div>

      {showSearch && (
        <div className="searchbar">
          <form className="wrap row" onSubmit={submit}>
            <div className="qwrap">
              <span className="ico" aria-hidden>
                ⌕
              </span>
              <input
                value={search.query}
                onChange={(e) => setSearch((s) => ({ ...s, query: e.target.value }))}
                placeholder="Search looks, garments, designers…"
                aria-label="Search African fashion"
              />
            </div>
            <select
              aria-label="His or Hers"
              value={search.gender}
              onChange={(e) => setSearch((s) => ({ ...s, gender: e.target.value }))}
            >
              <option value="">His / Hers</option>
              <option value="female">Hers</option>
              <option value="male">His</option>
            </select>
            <button type="submit" className="btn-search">
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

function Discover({ go }) {
  const creators = useAsync(() => Data.creators(), []) || [];
  const stories = listBlogPosts({ trendingFirst: true });
  const creatorPer = usePerPage("discover_creators");
  const storyPer = usePerPage("discover_stories");
  const creatorPage = usePaged(creators, creatorPer);
  const storyPage = usePaged(stories, storyPer);
  return (
    <>
      <div className="wrap page-head">
        <div className="crumbs">Home / Discover</div>
        <h1>Discover</h1>
        <p className="lead">Stories, tips, and African creatives to discover, engage, and patronize.</p>
      </div>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: "left", marginBottom: 18 }}>
            <div className="eyebrow">Creators</div>
            <h2 className="serif" style={{ fontSize: 28 }}>Promoted brand pool</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Brands that paid into promotion appear here and rotate into Virtual Wear (matched by event theme + outfit type).
            </p>
          </div>
          <div className="grid g3" style={{ marginBottom: 12 }}>
            {creatorPage.slice.map((c) => (
              <div className="card" key={c.id || c.name} style={{ cursor: "default" }}>
                <div className="meta">
                  <div className="t">{c.name}</div>
                  <div className="b">
                    {c.discipline || "fashion"}
                    {c.city ? ` · ${c.city}` : ""}
                    {c.is_promoted ? " · promoted" : ""}
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: "8px 0" }}>{c.bio || "African creative on MyYanga."}</p>
                  <div className="vw-actions" style={{ marginTop: 0 }}>
                    {c.whatsapp && (
                      <a className="btn btn-ghost btn-sm" href={`https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                    {c.instagram && (
                      <a className="btn btn-ghost btn-sm" href={c.instagram} target="_blank" rel="noreferrer">
                        Instagram
                      </a>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => go?.("virtualwear")}>
                      Virtual Wear
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => go?.("shop")}>
                      Shop
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pager page={creatorPage.page} totalPages={creatorPage.totalPages} onChange={creatorPage.setPage} />

          <div className="sec-head" style={{ textAlign: "left", marginBottom: 18, marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="eyebrow">Editorial</div>
              <h2 className="serif" style={{ fontSize: 28, margin: "6px 0 0" }}>Stories & guides</h2>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => go("blog")}>
              Open Blog
            </button>
          </div>
          <div className="blog-grid">
            {storyPage.slice.map((d) => (
              <article
                className="blog-card"
                key={d.slug || d.id}
                onClick={() => go("article", { slug: d.slug })}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && go("article", { slug: d.slug })}
              >
                <div className="blog-thumb">
                  <img src={d.thumb} alt="" />
                </div>
                <div className="blog-card-meta">
                  <div className="eyebrow">{d.trending ? "Trending" : d.category || "Story"}</div>
                  <h3 className="serif">{d.title}</h3>
                  <p className="blog-excerpt">{d.excerpt}</p>
                  <span className="blog-more">Read story →</span>
                </div>
              </article>
            ))}
          </div>
          <Pager page={storyPage.page} totalPages={storyPage.totalPages} onChange={storyPage.setPage} />
        </div>
      </section>
    </>
  );
}

function PYL() {
  return <PYLPage />;
}

function Premium() {
  const items = useAsync(() => Data.premium(), []) || [];
  return (
    <PayGate feature="premium">
      <div className="wrap page-head">
        <div className="crumbs">Home / Premium</div>
        <h1>MyYanga Premium</h1>
        <p className="lead">Exclusive tips, early drops and member events.</p>
      </div>
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="grid g3">
            {items.map((p) => (
              <div className="card" key={p.id}>
                <Img img={p.img} style={{ aspectRatio: "16/10" }} />
                <div className="meta">
                  <div className="t">{p.title}</div>
                  <div className="b">{p.tier}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PayGate>
  );
}

function VirtualWear({ go }) {
  return <VirtualWearPage go={go} />;
}

/* --------------------------------- admin --------------------------------- */
function Admin({ role, profile }) {
  const [tab, setTab] = useState("studio");
  const can = (priv) => profileHasPrivilege(profile, priv) || role === "owner" || role === "admin";
  const tabs = [
    can("content_studio") && ["studio", "Content Studio"],
    (profile?.is_owner || profile?.is_co_owner || role === "owner") && ["access", "Access Control"],
    can("monetization") && ["monetization", "Monetization"],
    can("editorial") && ["editorial", "Editorial"],
    can("analytics") && ["analytics", "Analytics"],
    can("catalog") && ["products", "Products"],
    (can("brand_e_vetting") || can("catalog")) && ["brands", "E-vetting / CAC"],
    can("catalog") && ["discovers", "Discovers"],
    can("catalog") && ["premium", "Premium"],
    can("reel_config") && ["reel", "Reel Config"],
  ].filter(Boolean);
  return <div className="wrap"><div className="page-head"><div className="crumbs">Admin</div><h1>Admin</h1><p className="lead">Signed in as <b>{profile?.email || role}</b>{profile?.is_owner ? " · Super admin" : profile?.is_co_owner ? " · Co-owner" : ""}. {role === "owner" || profile?.is_owner ? "You can Delete All and transfer ownership." : "Privileges follow Access Control grants."}</p></div>
    <div className="admin" style={{ border: "1px solid var(--line)" }}>
      <div className="admin-side">{tabs.map(([k, l]) => <a key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{l}</a>)}</div>
      <div className="admin-main">
        {tab === "studio" && <ContentStudio role={role} profile={profile} />}
        {tab === "access" && <AccessControlStudio profile={profile} />}
        {tab === "monetization" && <MonetizationStudio />}
        {tab === "editorial" && <EditorialAdmin role={role} />}
        {tab === "analytics" && <Analytics />}
        {tab === "products" && <AdminTable role={role} loader={() => Data.products()} label="Products" />}
        {tab === "brands" && <EVettingStudio />}
        {tab === "discovers" && <AdminTable role={role} loader={() => Data.discovers()} label="Discovers" />}
        {tab === "premium" && <AdminTable role={role} loader={() => Data.premium()} label="Premium" />}
        {tab === "reel" && <ReelConfig role={role} />}
      </div>
    </div></div>;
}
function Analytics() {
  const live = useAsync(async () => {
    if (!hasSupabase || !isProduction()) return null;
    const { data } = await supabase.rpc("admin_analytics");
    return data;
  }, []);
  const fashionLive = useAsync(async () => {
    if (!hasSupabase || !isProduction()) return null;
    const { data } = await supabase.rpc("admin_fashion_analytics", { p_days: 30 });
    return data;
  }, []);
  const local = aggregateFashionAnalytics(loadAnalyticsEvents({ limit: 2000 }));
  const fashion = fashionLive || local;
  const attrs = fashion.attributes || {
    colours: fashion.top_colours || [],
    styles: fashion.top_styles || [],
    parts: local.attributes.parts,
    gender: local.attributes.gender,
    price_bands: local.attributes.price_bands,
  };
  const fit = fashion.fit || local.fit;
  const returns = fashion.return_reason_matrix || local.return_reason_matrix;
  const platformRows = live
    ? [
        ["Users", live.users],
        ["Creators", live.creators],
        ["Garments", live.garments],
        ["Looks shared", live.looks],
        ["PYL entries", live.pyl_entries],
        ["Revenue 30d", "₦" + Number(live.payments_30d || 0).toLocaleString()],
        ["Premium subs", live.premium_subs],
      ]
    : [
        ["Anon events (device)", local.total_events],
        ["Sessions", local.sessions],
        ["Devices", local.devices],
        ["VW renders", local.fit.vw_renders],
        ["AI try-ons", local.fit.ai],
        ["Shares", local.fit.shares],
      ];

  const AttrList = ({ title, rows }) => (
    <div className="panel" style={{ marginTop: 0 }}>
      <div className="tick-label">{title}</div>
      {!rows?.length && <p className="muted" style={{ fontSize: 12 }}>No signals yet — browse, search, and try Virtual Wear.</p>}
      <div className="del-rows" style={{ border: "none" }}>
        {(rows || []).map((r) => (
          <div className="del-row" key={r.key} style={{ paddingLeft: 0, paddingRight: 0 }}>
            <span>{r.key}</span>
            <span className="muted" style={{ fontSize: 12 }}>{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <h2 className="serif" style={{ marginTop: 0 }}>Fashion analytics</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
        Anonymized interaction stream (no email, phone, or photos). Hyper-granular attributes, fit signals from Virtual
        Wear, and a return-reason matrix ready for retail checkout.{" "}
        {fashionLive ? "Live DB (30d)." : "Local device queue (Testing) — Production writes analytics_events."}
      </p>
      <div className="kpis">
        {platformRows.map(([l, v]) => (
          <div className="kpi" key={l}>
            <div className="v">{v}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <h3 className="serif" style={{ marginTop: 28 }}>1. Hyper-granular product</h3>
      <p className="muted" style={{ fontSize: 12 }}>Attribute conversion proxies — colour, style, part, price band from selects / search / try-on.</p>
      <div className="grid g3" style={{ marginTop: 12 }}>
        <AttrList title="Colours" rows={attrs.colours || fashion.top_colours} />
        <AttrList title="Styles / silhouettes" rows={attrs.styles || fashion.top_styles} />
        <AttrList title="Parts (SKU type)" rows={attrs.parts || local.attributes.parts} />
      </div>
      <div className="grid g3" style={{ marginTop: 12 }}>
        <AttrList title="His / Hers" rows={attrs.gender || local.attributes.gender} />
        <AttrList title="Price bands" rows={attrs.price_bands || local.attributes.price_bands} />
        <div className="panel">
          <div className="tick-label">Return reason matrix</div>
          <p className="muted" style={{ fontSize: 11, marginTop: 0 }}>
            Schema live ({RETURN_REASONS.length} reasons). Counts fill when garment checkout + returns ship.
          </p>
          <div className="del-rows" style={{ border: "none" }}>
            {Object.entries(returns).map(([k, v]) => (
              <div className="del-row" key={k} style={{ paddingLeft: 0, paddingRight: 0 }}>
                <span>{k.replace(/_/g, " ")}</span>
                <span className="muted" style={{ fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="serif" style={{ marginTop: 28 }}>2. Behaviour & fit signals</h3>
      <div className="kpis" style={{ marginTop: 12 }}>
        <div className="kpi"><div className="v">{fit.vw_renders || 0}</div><div className="l">Try-on renders</div></div>
        <div className="kpi"><div className="v">{fit.ai || 0}</div><div className="l">AI fit</div></div>
        <div className="kpi"><div className="v">{fit.canvas || 0}</div><div className="l">Canvas preview</div></div>
        <div className="kpi"><div className="v">{fit.shares || 0}</div><div className="l">Look shares</div></div>
      </div>
      <div style={{ marginTop: 12, maxWidth: 420 }}>
        <AttrList title="Scenes chosen" rows={fit.scenes || local.fit.scenes} />
      </div>

      <h3 className="serif" style={{ marginTop: 28 }}>Event stream (recent)</h3>
      <div className="del-rows">
        {local.recent.slice(0, 25).map((e) => (
          <div className="del-row" key={e.id}>
            <span>
              <b>{e.event}</b> · {e.view}
            </span>
            <span className="muted" style={{ fontSize: 11 }}>{new Date(e.ts).toLocaleString()}</span>
          </div>
        ))}
        {!local.recent.length && <p className="muted" style={{ padding: 12 }}>No events on this device yet.</p>}
      </div>

      <InsightsStudio />
    </>
  );
}
function AdminTable({ role, loader, label }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let on = true;
    Promise.resolve(loader()).then((d) => on && setRows(d));
    return () => {
      on = false;
    };
  }, []);
  if (!rows) return <p className="muted">Loading…</p>;
  const del = async (ids) => {
    try {
      await deleteSelectedRecords(label, ids);
      setRows((r) => r.filter((x) => !ids.includes(x.id)));
      toast(`Deleted ${ids.length} ${label.toLowerCase()}`);
    } catch (e) {
      toast(e.message || "Delete failed");
    }
  };
  const delAll = async () => {
    try {
      await deleteAllRecords(label);
      setRows([]);
      toast(`Deleted all ${label.toLowerCase()} (owner)`);
    } catch (e) {
      toast(e.message || "Delete all failed");
    }
  };
  return (
    <>
      <h2 className="serif" style={{ marginTop: 0 }}>
        {label}
      </h2>
      <DeleteControls userRole={role} rows={rows} getId={(r) => r.id} onDeleteSelected={del} onDeleteAll={delAll} label={label} />
    </>
  );
}
function ReelConfig({ role }) {
  const initial = useAsync(() => Data.reelConfig(), []);
  const placements = useAsync(() => Data.brandPlacements(), []) || [];
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (initial) setCfg({ ...initial, ...(loadReelConfigOverride() || {}) });
  }, [initial]);
  if (!cfg) return <p className="muted">Loading…</p>;
  const set = (k, v) => setCfg({ ...cfg, [k]: v });
  const save = () => {
    saveReelConfigOverride(cfg);
    toast("Reel config saved (Testing store — Production writes reel_config)");
  };
  const sendTest = async () => {
    setBusy(true);
    try {
      saveReelConfigOverride(cfg);
      const { reel, results } = await sendReelNow({
        title: "Admin test reel",
        forceChannels: { inapp: true, email: true, webpush: true, whatsapp: true },
      });
      toast(`Test reel ${reel.id} → ${results.map((r) => `${r.channel}:${r.ok ? "ok" : "skip"}`).join(", ")}`);
    } catch (e) {
      toast(e.message || "Send failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h2 className="serif" style={{ marginTop: 0 }}>Reel & Notification config</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Default delivery mode is a preference hint. Members also pick channels on <b>Reels</b>. WhatsApp does not require a
        BSP — dedicated SIM alone cannot automate sends; we queue + wa.me deep link (Cloud API optional later).
      </p>
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="field">
          <label>Default delivery mode</label>
          <select value={cfg.delivery_mode} onChange={(e) => set("delivery_mode", e.target.value)}>
            <option value="inapp">inapp</option>
            <option value="email">email</option>
            <option value="whatsapp">whatsapp</option>
            <option value="webpush">webpush</option>
          </select>
        </div>
        <div className="field">
          <label>Images per reel (1–30)</label>
          <input type="number" min="1" max="30" value={cfg.images_per_reel} onChange={(e) => set("images_per_reel", +e.target.value)} />
        </div>
        <div className="field">
          <label>Max brand slots (0–15)</label>
          <input
            type="number"
            min="0"
            max="15"
            value={cfg.max_brand_slots_per_reel}
            onChange={(e) => set("max_brand_slots_per_reel", +e.target.value)}
          />
        </div>
        <div className="field">
          <label>Send frequency</label>
          <select value={cfg.send_frequency} onChange={(e) => set("send_frequency", e.target.value)}>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
          </select>
        </div>
        <div className="field">
          <label>All users eligible</label>
          <select
            value={String(cfg.all_users_eligible)}
            onChange={(e) => set("all_users_eligible", e.target.value === "true")}
          >
            <option value="true">true — all active users</option>
            <option value="false">false — premium only</option>
          </select>
        </div>
        <div className="field">
          <label>VAPID public key (web push)</label>
          <input
            value={cfg.vapid_public_key || ""}
            onChange={(e) => set("vapid_public_key", e.target.value)}
            placeholder="Optional — enables PushManager.subscribe"
          />
        </div>
        <div className="action-row">
          <button type="button" className="btn" onClick={save}>
            Save config
          </button>
          <button type="button" className="btn btn-gold" disabled={busy} onClick={sendTest}>
            {busy ? "Sending…" : "Send test reel (all channels)"}
          </button>
        </div>
      </div>
      <h3 className="serif" style={{ marginTop: 22 }}>
        Brand placements
      </h3>
      <div className="del-rows">
        {placements.map((p) => (
          <div className="del-row" key={p.id}>
            <span>
              {p.brand} — {p.caption}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {p.impressions_delivered}/{p.impressions_purchased} · {p.is_active ? "active" : "spent"}
            </span>
          </div>
        ))}
      </div>
      <ReelDeliveryDiagnostics />
    </>
  );
}


/* Editorial admin — feeds the landing carousel */
function EditorialAdmin({ role }) {
  const [list, setList] = useState(() => getEditorial());
  const [sel, setSel] = useState(0);
  const [sizes, setSizes] = useState(null);
  const [busy, setBusy] = useState(false);
  if (role !== "owner" && role !== "admin") return <p className="muted">Editorial editing requires admin access.</p>;
  const cur = list[sel];
  const setField = (k, v) => setList((L) => L.map((e, i) => (i === sel ? { ...e, [k]: v } : e)));
  const onImg = async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { const out = await resizeForDevices(f); setSizes(out); setField("image", out[out.length - 1].url); } finally { setBusy(false); } };
  const publish = async () => {
    saveEditorial(list);
    if (hasSupabase && isProduction()) {
      try {
        await supabase.from("editorial_daily").update({ is_current: false }).eq("is_current", true);
        const rows = list.map((e) => ({
          kind: KIND_TO_DB[e.kind] || "outfit_of_day",
          title: e.title,
          creator: e.creator,
          description: e.description,
          image: e.image,
          link: e.link || "/shop",
          is_current: true,
          show_on: new Date().toISOString().slice(0, 10),
        }));
        const { error } = await supabase.from("editorial_daily").insert(rows);
        if (error) throw error;
        window.__toast?.("Editorial published to database — live on carousel");
        return;
      } catch (e) {
        window.__toast?.("Saved locally; DB publish failed: " + (e.message || ""));
        return;
      }
    }
    window.__toast?.("Editorial published — live on the landing carousel");
  };
  return (<>
    <h2 className="serif" style={{ marginTop: 0 }}>Editorial / Carousel</h2>
    <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>These feed the landing-page carousel. The details you enter here are exactly what visitors reveal.</p>
    <div className="chips" style={{ marginBottom: 14 }}>{list.map((e, i) => <span key={e.id} className="chip" style={i === sel ? { background: "var(--maroon)", color: "#fff" } : {}} onClick={() => { setSel(i); setSizes(null); }}>{e.kind}</span>)}</div>
    <div className="cs-grid">
      <div className="panel">
        <div className="field"><label>Kind</label><select value={cur.kind} onChange={(e) => setField("kind", e.target.value)}>{EDITORIAL_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
        <div className="field"><label>Title</label><input value={cur.title} onChange={(e) => setField("title", e.target.value)} /></div>
        <div className="field"><label>Creator / Brand</label><input value={cur.creator} onChange={(e) => setField("creator", e.target.value)} /></div>
        <div className="field"><label>Details (revealed to visitors)</label><textarea value={cur.description} onChange={(e) => setField("description", e.target.value)} style={{ width: "100%", minHeight: 84, padding: 10, border: "1px solid var(--line)", fontFamily: "inherit" }} /></div>
        <div className="field"><label>Image — auto-sized for devices</label>{cur.image ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src={cur.image} alt="" style={{ height: 56, border: "1px solid var(--line)" }} />{sizes && <span className="muted" style={{ fontSize: 11 }}>{sizes.map((z) => z.label + " " + z.width + "px").join(" · ")}</span>}<button className="link-danger" onClick={() => setField("image", null)}>Remove</button></div> : <><input type="file" accept="image/*" onChange={onImg} />{busy && <span className="muted" style={{ fontSize: 11 }}> generating sizes…</span>}</>}</div>
      </div>
      <div className="panel" style={{ background: "var(--cream)", padding: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, padding: "8px 14px", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>CAROUSEL SLIDE PREVIEW</div>
        {cur.image ? <img src={cur.image} alt="" style={{ width: "100%", display: "block" }} /> : <div style={{ aspectRatio: "16/9", background: `linear-gradient(135deg,${cur.img.c1},${cur.img.c2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'Playfair Display',serif", fontSize: 60 }}>{cur.img.t}</div>}
        <div style={{ padding: 16 }}><div className="eyebrow">{cur.kind}</div><h3 className="serif" style={{ fontSize: 24, margin: "4px 0" }}>{cur.title}</h3><div className="muted">{cur.creator}</div><p style={{ marginTop: 8, fontSize: 13 }}>{cur.description}</p></div>
      </div>
    </div>
    <div className="cs-publish"><span className="muted" style={{ fontSize: 13 }}>Edits publish to the landing carousel.</span><button className="btn" onClick={publish}>Publish carousel</button></div>
  </>);
}

/* Resources & cost (admin) */
const RES_ROWS = [
  { app: "MyYanga", apiCalls: 128400, aiCalls: 4200, imgTransforms: 9800, emails: 6100, events: 412000, costNGN: 286000 },
  { app: "MyAfriart", apiCalls: 74200, aiCalls: 2600, imgTransforms: 15200, emails: 3400, events: 228000, costNGN: 214000 },
  { app: "AdSpot", apiCalls: 301500, aiCalls: 1800, imgTransforms: 3200, emails: 9700, events: 910000, costNGN: 498000 },
  { app: "Owanbe", apiCalls: 96800, aiCalls: 5400, imgTransforms: 7300, emails: 5200, events: 268000, costNGN: 198000 },
];
function Resources() {
  const [sel, setSel] = useState([]);
  const scope = sel.length ? RES_ROWS.filter((r) => sel.includes(r.app)) : RES_ROWS;
  const tot = scope.reduce((t, r) => ({ apiCalls: t.apiCalls + r.apiCalls, aiCalls: t.aiCalls + r.aiCalls, imgTransforms: t.imgTransforms + r.imgTransforms, emails: t.emails + r.emails, events: t.events + r.events, costNGN: t.costNGN + r.costNGN }), { apiCalls: 0, aiCalls: 0, imgTransforms: 0, emails: 0, events: 0, costNGN: 0 });
  const toggle = (a) => setSel((s) => s.includes(a) ? s.filter((x) => x !== a) : [...s, a]);
  const max = Math.max(...RES_ROWS.map((r) => r.costNGN));
  return (
    <>
      <h2 className="serif" style={{ marginTop: 0 }}>Resources & cost</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>One app, any combination, or all cumulated.</p>
      <div className="chips" style={{ marginBottom: 14 }}>{RES_ROWS.map((r) => <span key={r.app} className="chip" style={sel.includes(r.app) ? { background: "var(--maroon)", color: "#fff" } : {}} onClick={() => toggle(r.app)}>{r.app}</span>)}</div>
      <div className="kpis" style={{ marginBottom: 16 }}>
        {[["Est. cost", naira(tot.costNGN)], ["API calls", tot.apiCalls.toLocaleString()], ["AI calls", tot.aiCalls.toLocaleString()], ["Events", tot.events.toLocaleString()]].map(([l, v]) => <div className="kpi" key={l}><div className="v">{v}</div><div className="l">{l}</div></div>)}
      </div>
      <div style={{ border: "1px solid var(--line)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ color: "var(--muted)", textAlign: "left" }}>{["Site", "API", "AI", "Img", "Emails", "Events", "Cost"].map((h) => <th key={h} style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>)}</tr></thead>
          <tbody>{scope.map((r) => <tr key={r.app}><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)", fontWeight: 600 }}>{r.app}</td><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>{r.apiCalls.toLocaleString()}</td><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>{r.aiCalls.toLocaleString()}</td><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>{r.imgTransforms.toLocaleString()}</td><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>{r.emails.toLocaleString()}</td><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>{r.events.toLocaleString()}</td><td style={{ padding: "9px 12px", borderBottom: "1px solid var(--line)" }}>{naira(r.costNGN)}</td></tr>)}
          <tr style={{ background: "var(--cream)", fontWeight: 800 }}><td style={{ padding: "9px 12px" }}>Cumulated</td><td style={{ padding: "9px 12px" }}>{tot.apiCalls.toLocaleString()}</td><td style={{ padding: "9px 12px" }}>{tot.aiCalls.toLocaleString()}</td><td style={{ padding: "9px 12px" }}>{tot.imgTransforms.toLocaleString()}</td><td style={{ padding: "9px 12px" }}>{tot.emails.toLocaleString()}</td><td style={{ padding: "9px 12px" }}>{tot.events.toLocaleString()}</td><td style={{ padding: "9px 12px" }}>{naira(tot.costNGN)}</td></tr></tbody>
        </table>
      </div>
      <h4 style={{ margin: "18px 0 8px" }}>Cost by site</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{scope.map((r, i) => <div key={r.app} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 90, fontSize: 12 }}>{r.app}</span><div style={{ flex: 1, background: "var(--cream)", height: 18 }}><div style={{ width: (r.costNGN / max * 100) + "%", height: "100%", background: ["#850713", "#B8893A", "#2E5E4E", "#7B3F8F"][i % 4] }} /></div><span style={{ width: 90, fontSize: 12, textAlign: "right" }}>{naira(r.costNGN)}</span></div>)}</div>
      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>Sample figures; wire to each app's metered usage in production.</p>
    </>
  );
}

/* --------------------------------- auth ---------------------------------- */
function AuthModal({ onClose }) {
  const { login, register, loginWithGoogle, requestWaOtp, loginWithWhatsApp, testAccounts, foundingEmail } =
    useAuth();
  const [mode, setMode] = useState("login");
  const [panel, setPanel] = useState("main"); // main | whatsapp | email
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [wa, setWa] = useState({ phone: "", code: "", sentCode: "", step: "phone" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      mode === "login" ? await login(f.email, f.password) : await register(f.name, f.email, f.password);
      toast("Welcome!");
      onClose();
    } catch (e) {
      toast("Auth failed: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setBusy(true);
    try {
      const r = await loginWithGoogle();
      track(EV.AUTH_METHOD, { provider: "google" });
      if (r?.testing) {
        toast(`Signed in as ${foundingEmail} (Google · super admin)`);
        onClose();
      } else {
        toast("Redirecting to Google…");
      }
    } catch (e) {
      toast("Google sign-in failed: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };
  const sendWa = async () => {
    setBusy(true);
    try {
      const r = await requestWaOtp(wa.phone);
      setWa((s) => ({
        ...s,
        phone: r.phone || s.phone,
        step: "code",
        sentCode: r.testing && r.code ? r.code : "",
      }));
      toast(r.testing ? `Testing OTP: ${r.code}` : "Code sent to WhatsApp");
    } catch (e) {
      toast(e?.message || "Could not send code");
    } finally {
      setBusy(false);
    }
  };
  const verifyWa = async () => {
    setBusy(true);
    try {
      await loginWithWhatsApp(wa.phone, wa.code);
      track(EV.AUTH_METHOD, { provider: "whatsapp" });
      toast("Signed in with WhatsApp");
      onClose();
    } catch (e) {
      toast(e?.message || "WhatsApp sign-in failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h3 className="serif" style={{ marginTop: 0 }}>
          {panel === "whatsapp" ? "Continue with WhatsApp" : panel === "email" ? (mode === "login" ? "Email login" : "Create account") : "Sign in"}
        </h3>

        {panel === "main" && (
          <>
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
              Google is the default. WhatsApp is available as a secondary option (no BSP).
            </p>
            <button
              className="btn"
              style={{ width: "100%", background: "#fff", color: "#1a1a1a", border: "1px solid var(--line)", marginBottom: 10, fontWeight: 600 }}
              disabled={busy}
              onClick={google}
            >
              Continue with Google
            </button>
            <p className="muted" style={{ fontSize: 11, marginTop: 0, marginBottom: 12, textAlign: "center" }}>
              Super admin <b>{foundingEmail}</b> — Google claims ownership automatically.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%", marginBottom: 8, border: "1px solid var(--line)" }}
              disabled={busy}
              onClick={() => setPanel("whatsapp")}
            >
              Continue with WhatsApp
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 12 }}
              onClick={() => setPanel("email")}
            >
              Use email instead
            </button>
          </>
        )}

        {panel === "whatsapp" && (
          <>
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              We’ll send a one-time code to your WhatsApp. Dedicated SIM is fine for the business number you register
              with Meta Cloud API — not for unofficial automation.
            </p>
            {wa.step === "phone" ? (
              <>
                <div className="field">
                  <label>WhatsApp number</label>
                  <input
                    value={wa.phone}
                    onChange={(e) => setWa({ ...wa, phone: e.target.value })}
                    placeholder="+234 801 234 5678"
                    inputMode="tel"
                  />
                </div>
                <button className="btn" style={{ width: "100%" }} disabled={busy} onClick={sendWa}>
                  {busy ? "Sending…" : "Send code"}
                </button>
              </>
            ) : (
              <>
                {wa.sentCode && (
                  <p className="muted" style={{ fontSize: 12, padding: "8px 10px", background: "var(--cream)", border: "1px solid var(--line)" }}>
                    Testing code: <b>{wa.sentCode}</b>
                  </p>
                )}
                <div className="field">
                  <label>6-digit code</label>
                  <input
                    value={wa.code}
                    onChange={(e) => setWa({ ...wa, code: e.target.value })}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
                <button className="btn" style={{ width: "100%" }} disabled={busy} onClick={verifyWa}>
                  {busy ? "Verifying…" : "Verify & sign in"}
                </button>
                <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: 8, fontSize: 12 }} onClick={sendWa}>
                  Resend code
                </button>
              </>
            )}
            <p
              className="muted"
              style={{ fontSize: 11, textAlign: "center", marginTop: 12, cursor: "pointer" }}
              onClick={() => setPanel("main")}
            >
              ← Back
            </p>
          </>
        )}

        {panel === "email" && (
          <>
            {testAccounts?.length > 0 && (
              <div className="panel" style={{ marginBottom: 12, padding: 12, background: "var(--cream)" }}>
                <div className="eyebrow">Testing / pre-prod</div>
                <p className="muted" style={{ fontSize: 11, margin: "6px 0 8px" }}>
                  Quick fill — prefer Google on the main screen for the founding super admin.
                </p>
                {testAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    className="btn btn-ghost"
                    style={{ display: "block", width: "100%", marginBottom: 6, padding: "8px 10px", fontSize: 11, textAlign: "left" }}
                    onClick={() => setF({ name: a.name, email: a.email, password: a.password })}
                  >
                    {a.role}: {a.email}
                  </button>
                ))}
              </div>
            )}
            {mode === "register" && testAccounts?.length > 0 && (
              <p
                className="muted"
                style={{ fontSize: 11, margin: "0 0 10px", padding: "8px 10px", background: "var(--cream)", border: "1px solid var(--line)" }}
              >
                Testing phase: new sign-ups get <b>full Admin Studio access</b>. Rights revoke in Production.
              </p>
            )}
            {mode === "register" && (
              <div className="field">
                <label>Name</label>
                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </div>
            <button className="btn" style={{ width: "100%" }} disabled={busy} onClick={submit}>
              {mode === "login" ? "Login" : "Sign up"}
            </button>
            <p
              className="muted"
              style={{ fontSize: 11, textAlign: "center", marginTop: 8, cursor: "pointer" }}
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create an account" : "Have an account? Login"}
            </p>
            <p
              className="muted"
              style={{ fontSize: 11, textAlign: "center", marginTop: 8, cursor: "pointer" }}
              onClick={() => setPanel("main")}
            >
              ← Back to Google / WhatsApp
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- toggle -------------------------------- */
function ModeToggle({ show }) {
  const { mode, setMode, canGoProduction } = useDbMode();
  if (!show) return null;
  const testing = mode !== "production";
  return (
    <div className="dbtoggle">
      Mode: {testing ? "TESTING" : "PRODUCTION"}
      <button
        onClick={() => {
          if (testing) {
            if (!canGoProduction) {
              window.__toast?.("Set VITE_SUPABASE_URL + anon key to enable Production");
              return;
            }
            setMode("production");
            window.__toast?.("Production mode — live Supabase data");
          } else {
            setMode("testing");
            window.__toast?.("Testing mode — mock garments + Admin Studio uploads");
          }
        }}
      >
        {testing ? (canGoProduction ? "Go PRODUCTION" : "PRODUCTION (set env)") : "Go TESTING"}
      </button>
    </div>
  );
}

/* ---------------------------------- app ---------------------------------- */
export default function App() {
  useStyle();
  const [view, setView] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("view") || "home";
    } catch {
      return "home";
    }
  });
  const [reelHighlight, setReelHighlight] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("reel") || null;
    } catch {
      return null;
    }
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [shareLook, setShareLook] = useState(() => shareCodeFromPath());
  const [headerSearch, setHeaderSearch] = useState({ ...HEADER_SEARCH_DEFAULT });
  const [searchSeed, setSearchSeed] = useState(null);
  const [searchSeedKey, setSearchSeedKey] = useState(0);
  const [browseSeed, setBrowseSeed] = useState(null);
  const [productId, setProductId] = useState(null);
  const [articleSlug, setArticleSlug] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("slug") || null;
    } catch {
      return null;
    }
  });
  const bagTick = useBagTick(React);
  const bagN = bagCount() + bagTick * 0; // re-read when tick changes
  const { profile, role, isAdmin, logout } = useAuth();
  const go = (v, opts = {}) => {
    setShareLook(null);
    if (opts.garmentId != null) setProductId(opts.garmentId);
    if (opts.slug != null) setArticleSlug(opts.slug);
    else if (v !== "article") setArticleSlug(null);
    if (window.location.pathname.match(/\/look\//)) window.history.pushState({}, "", "/");
    const q = new URLSearchParams();
    if (v && v !== "home") q.set("view", v);
    if (opts.garmentId != null) q.set("g", String(opts.garmentId));
    if (opts.slug) q.set("slug", opts.slug);
    const qs = q.toString();
    window.history.pushState({}, "", qs ? `/?${qs}` : "/");
    setView(v);
    trackPageView(v);
    window.scrollTo(0, 0);
  };
  const openBrowse = (seed) => {
    const next = { ...emptyMultiFilters(), ...seed };
    setBrowseSeed(next);
    setSearchSeed(next);
    setSearchSeedKey((k) => k + 1);
    go("smart");
  };
  const navItems = [["home", "Home"], ["explore", "Explore"], ["shop", "Shop"], ["smart", "Smart Search"], ["reels", "Reels"], ["discover", "Discover"], ["blog", "Blog"], ["events", "Events"], ["pyl", "Post Your Look"], ["virtualwear", "Virtual Wear"], ["settings", "Settings"]];

  const runHeaderSearch = () => {
    if (!headerSearch.gender) {
      toast("Pick His or Hers in the header, then Search");
      return;
    }
    const seed = {
      ...emptyMultiFilters(),
      gender: headerSearch.gender,
      query: headerSearch.query || "",
    };
    track(EV.SEARCH, { gender: seed.gender, has_query: !!seed.query, source: "header" });
    setSearchSeed(seed);
    setBrowseSeed(seed);
    setSearchSeedKey((k) => k + 1);
    go("smart");
  };

  useEffect(() => {
    const ref = consumePaymentReturn();
    if (ref)
      verifyPaymentReturn(ref)
        .then((d) =>
          toast(d?.feature === "retail_checkout" ? "Order paid — designer settled via gateway split" : "Payment confirmed — you now have access"),
        )
        .catch((e) => toast(e.message));
  }, []);

  useEffect(() => {
    const onNav = () => {
      setShareLook(shareCodeFromPath());
      try {
        const q = new URLSearchParams(window.location.search);
        if (q.get("view")) setView(q.get("view"));
        if (q.get("reel")) setReelHighlight(q.get("reel"));
        if (q.get("g")) setProductId(q.get("g"));
        if (q.get("slug")) setArticleSlug(q.get("slug"));
        else if (q.get("view") !== "article") setArticleSlug(null);
      } catch {}
    };
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  // hydrate product id / article slug from URL on first paint
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const g = q.get("g");
      if (g) setProductId(g);
      const slug = q.get("slug");
      if (slug) setArticleSlug(slug);
    } catch {}
  }, []);

  const render = () => {
    switch (view) {
      case "home": return <Home go={go} openBrowse={openBrowse} />;
      case "explore": return <Explore go={go} openBrowse={openBrowse} />;
      case "shop": return <Shop browseSeed={browseSeed} go={go} />;
      case "product": return <ProductPage garmentId={productId} go={go} />;
      case "bag": return <BagPage go={go} onLogin={() => setAuthOpen(true)} />;
      case "smart": return <SmartSearch seed={searchSeed} seedKey={searchSeedKey} go={go} />;
      case "reels": return <ReelsPage go={go} highlightId={reelHighlight} />;
      case "discover": return <Discover go={go} />;
      case "blog": return <BlogIndex go={go} />;
      case "article": return <BlogArticle slug={articleSlug} go={go} />;
      case "events": return <EventsPage />;
      case "pyl": return <PYL />;
      case "premium": return <Premium />;
      case "virtualwear": return <VirtualWear go={go} />;
      case "settings": return <SettingsPage go={go} />;
      case "about":
      case "privacy":
      case "terms":
      case "contact":
      case "grooming":
        return <LegalPage page={view} go={go} />;
      case "admin": return isAdmin ? <Admin role={role} profile={profile} /> : <Home go={go} openBrowse={openBrowse} />;
      default: return <Home go={go} openBrowse={openBrowse} />;
    }
  };

  if (shareLook) {
    return (
      <>
        <header className="site-header">
          <div className="logobar">
            <div className="wrap row">
              <span className="logo" onClick={() => go("home")} style={{ cursor: "pointer" }}>
                My<b>Yanga</b>
              </span>
            </div>
          </div>
        </header>
        <main>
          <LookSharePage code={shareLook} onExit={() => go("home")} />
        </main>
        <ModeToggle show={isAdmin} />
      </>
    );
  }

  return (
    <>
      <SiteAnalytics view={view} />
      <SiteHeader
        view={view}
        go={go}
        navItems={navItems}
        isAdmin={isAdmin}
        profile={profile}
        logout={logout}
        onLogin={() => setAuthOpen(true)}
        search={headerSearch}
        setSearch={setHeaderSearch}
        onSearch={runHeaderSearch}
        bagN={bagN}
      />

      <main>{render()}</main>

      <footer><div className="wrap foot">
        <div><div className="logo" style={{ color: "#fff" }}>My<b style={{ color: "#ff8a98" }}>Yanga</b></div><p className="muted" style={{ marginTop: 10, fontSize: 13 }}>The best of African fashion creativity, in one spot.</p><p className="muted" style={{ marginTop: 10, fontSize: 12 }}>info@myyanga.com · +234 706 242 5945<br />ZonicMe Limited, Floor M2, Transcorp Hilton, Abuja</p></div>
        <div><h5>Discover</h5><a onClick={() => go("explore")}>Explore</a><a onClick={() => go("shop")}>Shop</a><a onClick={() => go("premium")}>Premium</a><a onClick={() => go("pyl")}>Post Your Look</a></div>
        <div><h5>More</h5><a onClick={() => go("discover")}>Discover</a><a onClick={() => go("virtualwear")}>Virtual Wear</a><a onClick={() => go("blog")}>Blog</a><a onClick={() => go("grooming")}>Grooming</a></div>
        <div><h5>Company</h5><a onClick={() => go("about")}>About</a><a onClick={() => go("privacy")}>Privacy</a><a onClick={() => go("terms")}>Terms</a><a onClick={() => go("contact")}>Contact</a></div>
      </div><div className="wrap foot-b"><span>© {new Date().getFullYear()} MyYanga. Powered by ZonicMe.</span><span>Abuja · Lagos · Diaspora</span></div></footer>

      <ModeToggle show={isAdmin} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
