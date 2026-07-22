import { supabase, hasSupabase } from "./supabase.js";
import { isProduction } from "./dataBridge.js";

const TABLE_BY_LABEL = {
  Products: "products",
  Discovers: "discovers",
  Premium: "premium_content",
};

export function tableForAdminLabel(label) {
  return TABLE_BY_LABEL[label] || null;
}

export async function deleteSelectedRecords(label, ids) {
  const table = tableForAdminLabel(label);
  if (!table || !hasSupabase || !isProduction()) return { local: true };
  const { error } = await supabase.rpc("delete_selected_records", { target: table, ids });
  if (error) throw error;
  return { local: false };
}

export async function deleteAllRecords(label) {
  const table = tableForAdminLabel(label);
  if (!table || !hasSupabase || !isProduction()) return { local: true };
  const { error } = await supabase.rpc("delete_all_records", { target: table });
  if (error) throw error;
  return { local: false };
}
