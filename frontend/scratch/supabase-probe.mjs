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
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  envVars[key] = val;
}
const supabase = createClient(envVars["NEXT_PUBLIC_SUPABASE_URL"], envVars["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);

const ALL_TABLES = [
  "conversations", "conversation_summaries", "profiles", "users",
  "workspace_items", "image_history", "image_generation_jobs",
  "user_memories", "user_preferences", "user_feedback",
  "evaluation_runs", "visual_references", "files", "documents",
  "organizations", "org_members", "chat_messages", "sessions",
  "storage_objects", "auth_users"
];

console.log("=== SUPABASE TABLE EXISTENCE PROBE ===\n");
const results = { exists: [], missing: [], rls_blocked: [] };

for (const table of ALL_TABLES) {
  try {
    const { data, error, status } = await supabase.from(table).select("*").limit(1);
    if (!error) {
      results.exists.push({ table, rows: data?.length ?? 0, status });
      console.log(`✅ EXISTS   '${table}' — ${data?.length ?? 0} rows visible (anon)`);
    } else if (error.message.includes("schema cache") || error.code === "42P01") {
      results.missing.push(table);
      console.log(`❌ MISSING  '${table}': ${error.message.slice(0, 60)}`);
    } else {
      results.rls_blocked.push({ table, msg: error.message.slice(0, 60), code: error.code });
      console.log(`🔒 RLS/ERR  '${table}': [${error.code}] ${error.message.slice(0, 60)}`);
    }
  } catch (e) {
    console.log(`💥 CRASH    '${table}': ${e.message.slice(0, 60)}`);
  }
}

console.log("\n=== SUMMARY ===");
console.log("Existing tables:", results.exists.map(r => r.table).join(", ") || "none");
console.log("Missing tables:", results.missing.join(", ") || "none");
console.log("RLS blocked (table exists but restricted):", results.rls_blocked.map(r => r.table).join(", ") || "none");
