/** Shared constants — keep free of circular imports with testStore. */
export const FOUNDING_OWNER_EMAIL = "oadeagbo@gmail.com";

export const PRIVILEGE_CATALOG = [
  { id: "content_studio", label: "Content Studio", desc: "Edit page copy and media" },
  { id: "editorial", label: "Editorial carousel", desc: "Publish outfit/bride/look of the day" },
  { id: "monetization", label: "Monetization studio", desc: "Feature prices and pay gates" },
  { id: "analytics", label: "Analytics", desc: "Platform metrics" },
  { id: "catalog", label: "Catalog", desc: "Products, brands, discovers, premium rows" },
  { id: "brand_e_vetting", label: "Vetted promotion / e-vetting", desc: "CAC verify brands, promote, unlock shopping cart" },
  { id: "garments", label: "Garments / Virtual Wear assets", desc: "Upload and manage garment assets" },
  { id: "reel_config", label: "Reel config", desc: "Notification reel settings" },
  { id: "events", label: "Events", desc: "Publish and manage events" },
  { id: "users_roles", label: "User roles", desc: "Promote users to admin/brand" },
  { id: "access_control", label: "Access control", desc: "View directory (mutations owner-gated)" },
  { id: "delete_selected", label: "Delete selected", desc: "Multi-select delete" },
  { id: "delete_all", label: "Delete all", desc: "Owner-level wipe (dangerous)" },
];
