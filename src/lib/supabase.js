import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guarded: in mock mode (no env) this stays null and the data bridge serves
// local mock data, so the app runs with no database.
export const supabase = url && anon ? createClient(url, anon) : null;
export const hasSupabase = !!supabase;
