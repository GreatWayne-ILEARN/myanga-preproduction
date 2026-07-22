import { useEffect, useState, useCallback } from "react";
import { supabase, hasSupabase } from "./lib/supabase.js";
import {
  getMode,
  setMode,
  onModeChange,
  canGoProduction,
  isProduction,
  isTesting,
} from "./lib/dataBridge.js";
import {
  authenticateTester,
  authenticateGoogleTester,
  registerTester,
  loadTestSession,
  saveTestSession,
  TEST_ACCOUNTS,
  loadAccessState,
} from "./lib/testStore.js";
import { FOUNDING_OWNER_EMAIL } from "./lib/accessControlConstants.js";
import { claimFoundingOwner } from "./lib/accessControl.js";
import { requestWhatsAppOtp, verifyWhatsAppOtp } from "./lib/whatsappAuth.js";

export function useDbMode() {
  const [mode, setM] = useState(getMode());
  useEffect(() => onModeChange(setM), []);
  return {
    mode,
    setMode,
    canGoLive: canGoProduction(),
    canGoProduction: canGoProduction(),
    isProduction: mode === "production",
    isTesting: mode !== "production",
  };
}

async function enrichProductionProfile(user) {
  let { data } = await supabase
    .from("profiles")
    .select("id,name,email,role,is_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split("@")[0],
    });
    const again = await supabase
      .from("profiles")
      .select("id,name,email,role,is_owner")
      .eq("id", user.id)
      .maybeSingle();
    data = again.data;
  }

  // Founding email auto-claim after Google / email login
  if (user.email?.toLowerCase() === FOUNDING_OWNER_EMAIL.toLowerCase() && data && !data.is_owner) {
    try {
      await claimFoundingOwner();
      const refreshed = await supabase
        .from("profiles")
        .select("id,name,email,role,is_owner")
        .eq("id", user.id)
        .maybeSingle();
      data = refreshed.data || data;
    } catch {}
  }

  let privileges = [];
  let is_co_owner = false;
  try {
    const { data: privs } = await supabase.from("admin_privileges").select("privilege").eq("user_id", user.id);
    privileges = (privs || []).map((p) => p.privilege);
    const { data: co } = await supabase.from("platform_co_owners").select("user_id").eq("user_id", user.id).maybeSingle();
    is_co_owner = !!co;
  } catch {}

  return {
    ...(data || {
      id: user.id,
      email: user.email,
      name: user.email?.split("@")[0],
      role: "user",
      is_owner: false,
    }),
    privileges,
    is_co_owner,
    auth_provider: user.app_metadata?.provider || "email",
  };
}

/**
 * Auth:
 * - Default: Google OAuth (primary CTA)
 * - Secondary: WhatsApp OTP (Cloud API optional; Testing mock)
 * - Tertiary: email/password
 */
export function useAuth() {
  const [profile, setProfile] = useState(null);
  const [modeTick, setModeTick] = useState(getMode());

  useEffect(() => onModeChange(setModeTick), []);

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      return;
    }
    if (hasSupabase && isProduction()) {
      setProfile(await enrichProductionProfile(user));
      return;
    }
    setProfile({
      id: user.id,
      email: user.email,
      name: user.email?.split("@")[0],
      role: "user",
      is_owner: false,
      privileges: [],
    });
  }, []);

  useEffect(() => {
    if (isTesting()) {
      setProfile(loadTestSession());
      return;
    }
    if (!hasSupabase) {
      setProfile(null);
      return;
    }
    supabase.auth.getUser().then(({ data }) => loadProfile(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) =>
      loadProfile(sess?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, modeTick]);

  const login = useCallback(
    async (email, password) => {
      if (isTesting()) {
        const p = authenticateTester(email, password);
        saveTestSession(p);
        setProfile(p);
        return;
      }
      if (!hasSupabase) throw new Error("Configure Supabase for Production login");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadProfile(data.user);
    },
    [loadProfile],
  );

  const loginWithGoogle = useCallback(async () => {
    if (isTesting()) {
      const p = authenticateGoogleTester(FOUNDING_OWNER_EMAIL);
      // Refresh privileges from local access state
      const st = loadAccessState();
      const adminRow = st.admins.find((a) => a.email.toLowerCase() === FOUNDING_OWNER_EMAIL.toLowerCase());
      const full = { ...p, privileges: adminRow?.privileges || [], auth_provider: "google" };
      saveTestSession(full);
      setProfile(full);
      return { ok: true, testing: true };
    }
    if (!hasSupabase) throw new Error("Configure Supabase for Google sign-in");
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { access_type: "offline", prompt: "select_account" } },
    });
    if (error) throw error;
    return { ok: true, redirecting: true };
  }, []);

  const requestWaOtp = useCallback(async (phone) => requestWhatsAppOtp(phone), []);

  const loginWithWhatsApp = useCallback(
    async (phone, code) => {
      const r = await verifyWhatsAppOtp(phone, code);
      if (r.testing && r.profile) {
        saveTestSession(r.profile);
        setProfile(r.profile);
        return { ok: true, testing: true };
      }
      const { data } = await supabase.auth.getUser();
      await loadProfile(data.user);
      return { ok: true };
    },
    [loadProfile],
  );

  const register = useCallback(
    async (name, email, password) => {
      if (isTesting()) {
        const isFounding = email.toLowerCase() === FOUNDING_OWNER_EMAIL.toLowerCase();
        if (isFounding) {
          const p = {
            id: "founding",
            email: FOUNDING_OWNER_EMAIL,
            name: name || "Olufemi Adeagbo",
            role: "owner",
            is_owner: true,
            privileges: [],
          };
          saveTestSession(p);
          setProfile(p);
          return;
        }
        // Testing phase: every sign-up becomes a studio admin immediately.
        // These rights live only in the local testing store and are revoked
        // in Production, where roles come from the profiles table.
        const p = registerTester(name, email, password);
        saveTestSession(p);
        setProfile(p);
        return;
      }
      if (!hasSupabase) throw new Error("Configure Supabase to register");
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, email, name });
        await loadProfile(data.user);
      }
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    if (isTesting()) {
      saveTestSession(null);
      setProfile(null);
      return;
    }
    if (hasSupabase) await supabase.auth.signOut().catch(() => {});
    setProfile(null);
  }, []);

  const role = profile ? (profile.is_owner ? "owner" : profile.role) : null;
  const isAdmin =
    role === "owner" ||
    role === "admin" ||
    !!profile?.is_owner ||
    !!profile?.is_co_owner;

  return {
    profile,
    role,
    isAdmin,
    login,
    loginWithGoogle,
    requestWaOtp,
    loginWithWhatsApp,
    register,
    logout,
    testAccounts: isTesting() ? TEST_ACCOUNTS.filter((a) => !a.google) : [],
    foundingEmail: FOUNDING_OWNER_EMAIL,
  };
}
