import { supabase, hasSupabase } from "./supabase.js";
import { isProduction } from "./dataBridge.js";
import {
  FOUNDING_OWNER_EMAIL,
  PRIVILEGE_CATALOG,
} from "./accessControlConstants.js";
import {
  loadAccessState,
  saveAccessState,
  defaultAccessState,
} from "./testStore.js";

export { FOUNDING_OWNER_EMAIL, PRIVILEGE_CATALOG };

function live() {
  return hasSupabase && isProduction();
}

export async function claimFoundingOwner() {
  if (!live()) {
    const st = loadAccessState();
    st.foundingClaimed = true;
    saveAccessState(st);
    return { ok: true, email: FOUNDING_OWNER_EMAIL, is_owner: true };
  }
  const { data, error } = await supabase.rpc("claim_founding_owner");
  if (error) throw error;
  return data;
}

export async function listAccessDirectory() {
  if (!live()) {
    const st = loadAccessState();
    return {
      founding_owner_email: FOUNDING_OWNER_EMAIL,
      owners: st.owners,
      co_owners: st.coOwners,
      admins: st.admins,
      audit: st.audit,
      testing: true,
    };
  }
  const { data, error } = await supabase.rpc("list_access_directory");
  if (error) throw error;
  return data;
}

export async function transferSuperAdmin(email, confirm) {
  if (!live()) {
    if (confirm !== "TRANSFER SUPER ADMIN") throw new Error("Type TRANSFER SUPER ADMIN to confirm");
    const st = loadAccessState();
    const prev = st.owners.find((o) => o.is_owner) || st.owners[0];
    st.owners = st.owners.map((o) => ({
      ...o,
      is_owner: o.email.toLowerCase() === email.toLowerCase(),
      role: o.email.toLowerCase() === email.toLowerCase() ? "owner" : "admin",
    }));
    if (!st.owners.find((o) => o.email.toLowerCase() === email.toLowerCase())) {
      st.owners.push({
        id: `u-${Date.now()}`,
        email,
        name: email.split("@")[0],
        is_owner: true,
        role: "owner",
      });
    }
    if (prev && prev.email.toLowerCase() !== email.toLowerCase()) {
      st.coOwners = [
        { user_id: prev.id, email: prev.email, note: "Previous super admin after transfer" },
        ...st.coOwners.filter((c) => c.email !== prev.email),
      ];
    }
    st.admins = st.admins.map((a) =>
      a.email.toLowerCase() === email.toLowerCase()
        ? { ...a, is_owner: true, role: "owner" }
        : a.email === prev?.email
          ? { ...a, is_owner: false, role: "admin" }
          : a,
    );
    st.audit.unshift({
      action: "transfer_super_admin",
      target_email: email,
      created_at: new Date().toISOString(),
    });
    saveAccessState(st);
    return { ok: true, to: email };
  }
  const { data, error } = await supabase.rpc("transfer_super_admin", {
    p_to_email: email,
    p_confirm: confirm,
  });
  if (error) throw error;
  return data;
}

export async function addCoOwner(email, note) {
  if (!live()) {
    const st = loadAccessState();
    st.coOwners = [
      { user_id: `co-${Date.now()}`, email, note },
      ...st.coOwners.filter((c) => c.email.toLowerCase() !== email.toLowerCase()),
    ];
    if (!st.admins.find((a) => a.email.toLowerCase() === email.toLowerCase())) {
      st.admins.push({
        id: `a-${Date.now()}`,
        email,
        name: email.split("@")[0],
        role: "admin",
        is_owner: false,
        privileges: [],
      });
    }
    st.audit.unshift({
      action: "add_co_owner",
      target_email: email,
      created_at: new Date().toISOString(),
    });
    saveAccessState(st);
    return { ok: true, email };
  }
  const { data, error } = await supabase.rpc("add_co_owner", {
    p_email: email,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}

export async function removeCoOwner(email) {
  if (!live()) {
    const st = loadAccessState();
    st.coOwners = st.coOwners.filter((c) => c.email.toLowerCase() !== email.toLowerCase());
    st.audit.unshift({
      action: "remove_co_owner",
      target_email: email,
      created_at: new Date().toISOString(),
    });
    saveAccessState(st);
    return { ok: true };
  }
  const { data, error } = await supabase.rpc("remove_co_owner", { p_email: email });
  if (error) throw error;
  return data;
}

export async function grantPrivileges(email, privileges) {
  if (!live()) {
    const st = loadAccessState();
    let admin = st.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!admin) {
      admin = {
        id: `a-${Date.now()}`,
        email,
        name: email.split("@")[0],
        role: "admin",
        is_owner: false,
        privileges: [],
      };
      st.admins.unshift(admin);
    }
    admin.privileges = Array.from(new Set([...(admin.privileges || []), ...privileges]));
    admin.role = "admin";
    st.audit.unshift({
      action: "grant_privileges",
      target_email: email,
      created_at: new Date().toISOString(),
      detail: { privileges },
    });
    saveAccessState(st);
    return { ok: true, email, privileges };
  }
  const { data, error } = await supabase.rpc("grant_privileges", {
    p_email: email,
    p_privileges: privileges,
  });
  if (error) throw error;
  return data;
}

export async function revokePrivileges(email, privileges) {
  if (!live()) {
    const st = loadAccessState();
    st.admins = st.admins.map((a) =>
      a.email.toLowerCase() === email.toLowerCase()
        ? { ...a, privileges: (a.privileges || []).filter((p) => !privileges.includes(p)) }
        : a,
    );
    st.audit.unshift({
      action: "revoke_privileges",
      target_email: email,
      created_at: new Date().toISOString(),
    });
    saveAccessState(st);
    return { ok: true };
  }
  const { data, error } = await supabase.rpc("revoke_privileges", {
    p_email: email,
    p_privileges: privileges,
  });
  if (error) throw error;
  return data;
}

export function profileHasPrivilege(profile, privilege) {
  if (!profile) return false;
  if (profile.is_owner || profile.is_co_owner) return true;
  if (profile.role === "owner") return true;
  if (privilege === "delete_all") {
    return !!(profile.is_owner || (profile.privileges || []).includes("delete_all"));
  }
  return (
    (profile.privileges || []).includes(privilege) ||
    (profile.role === "admin" && privilege === "delete_selected")
  );
}

export { defaultAccessState };
