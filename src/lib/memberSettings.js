/**
 * Member profile + settings (Testing = localStorage; Production mirrors profiles where possible).
 */
const PROFILE_KEY = "myyanga_member_settings";

export function defaultMemberSettings() {
  return {
    display_name: "",
    email: "",
    phone: "",
    city: "",
    country: "Nigeria",
    fashion_preference: "", // female | male | ""
    bio: "",
    updated_at: null,
  };
}

export function loadMemberSettings() {
  try {
    return { ...defaultMemberSettings(), ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") };
  } catch {
    return defaultMemberSettings();
  }
}

export function saveMemberSettings(partial) {
  const next = {
    ...loadMemberSettings(),
    ...partial,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}
