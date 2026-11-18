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

async function probeColumns(table) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`Table ${table} error:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`Table ${table} sample keys:`, Object.keys(data[0]));
  } else {
    // Attempt an empty insert with an invalid column to see valid column suggestions
    const { error: insErr } = await supabase.from(table).insert({ __probe_nonexistent_col__: 1 });
    console.log(`Table ${table} empty, insert error:`, insErr?.message);
  }
}

console.log("=== INSPECTING COLUMNS OF EXISTING SUPABASE TABLES ===");
await probeColumns("conversations");
await probeColumns("user_preferences");
await probeColumns("image_history");
await probeColumns("user_memories");
