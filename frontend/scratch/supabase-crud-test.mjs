import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
}
const supabase = createClient(envVars["NEXT_PUBLIC_SUPABASE_URL"], envVars["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);

console.log("=== SUPABASE DISPOSABLE TEST DATA VERIFICATION ===");

// 1. Read test on existing user_preferences
const { data: prefs, error: prefErr } = await supabase.from("user_preferences").select("*").limit(2);
console.log("1. Read user_preferences:", prefErr ? `ERR: ${prefErr.message}` : `SUCCESS (${prefs?.length} rows found)`);

// 2. Read test on conversations
const { data: convs, error: convErr } = await supabase.from("conversations").select("*").limit(2);
console.log("2. Read conversations:", convErr ? `ERR: ${convErr.message}` : `SUCCESS (${convs?.length} rows found)`);

// 3. Write test on conversations with anonymous/unauthenticated client (RLS enforcement check)
const testSessionId = "audit_disposable_" + Date.now();
const { data: insData, error: insErr } = await supabase.from("conversations").insert({
  id: testSessionId,
  title: "Disposable Audit Probe",
  created_at: new Date().toISOString()
});
if (insErr) {
  console.log("3. Anonymous Write to conversations:", `BLOCKED BY RLS (Correct security behavior: ${insErr.message})`);
} else {
  console.log("3. Anonymous Write to conversations: Permitted (Cleaning up...)");
  await supabase.from("conversations").delete().eq("id", testSessionId);
}

// 4. Test Supabase Storage bucket listing
const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
console.log("4. Storage listBuckets:", bucketErr ? `RESTRICTED (Anon access denied: ${bucketErr.message})` : `SUCCESS: ${buckets.map(b => b.name).join(", ")}`);
