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

const sb = createClient(envVars["NEXT_PUBLIC_SUPABASE_URL"], envVars["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);
const candidateTables = [
  'conversations', 'user_preferences', 'user_memories', 'image_history',
  'workspace_items', 'image_generation_jobs', 'users', 'profiles',
  'evaluation_runs', 'user_feedback', 'visual_references'
];

console.log("=== SUPABASE LIVE SCHEMA PROBE ===");
for (const t of candidateTables) {
  const { data, error } = await sb.from(t).select('*').limit(1);
  console.log(t.padEnd(25) + ' -> ' + (error ? error.message : `EXISTS (${data?.length} rows)`));
}
