import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const sb = createClient(url, key);
const users = [
  ["owner@myyanga.com", "Owner", "owner", true],
  ["admin@myyanga.com", "Staff Admin", "admin", false],
  ["deola@myyanga.com", "Deola", "brand", false],
  ["ada@myyanga.com", "Ada", "user", false],
];
for (const [email, name, role, is_owner] of users) {
  const { data, error } = await sb.auth.admin.createUser({ email, password: "MyYanga2026!", email_confirm: true });
  if (error) { console.log(email, "->", error.message); continue; }
  await sb.from("profiles").upsert({ id: data.user.id, email, name, role, is_owner });
  console.log("created", email, role, is_owner ? "(owner)" : "");
}
console.log("done");
