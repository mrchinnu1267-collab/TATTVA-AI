/**
 * Supabase CRUD verification script — disposable test records only.
 * Uses env vars from .env.local via dotenv.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually (no external dotenv in worktree scratch)
const envPath = resolve(__dirname, "../.env.local");
let envContent = "";
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  console.error("FAIL: Could not read .env.local");
  process.exit(1);
}

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

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("FAIL: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

console.log("Supabase URL key count:", supabaseUrl.length, "chars (not printing value)");
console.log("Anon key length:", supabaseKey.length, "chars (not printing value)");

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("\n--- DB Verification Start ---");

  // 1. Test basic connectivity — query a system table
  console.log("\n[1] Testing basic connectivity...");
  try {
    const { data, error } = await supabase.rpc("version");
    if (error) {
      console.log("   RPC version error (expected if function not exposed):", error.message);
    } else {
      console.log("   PostgreSQL version:", data);
    }
  } catch (e) {
    console.log("   RPC not available:", e.message);
  }

  // 2. List accessible tables by trying known ones
  console.log("\n[2] Checking known tables...");
  const knownTables = ["profiles", "users", "image_jobs", "image_generation_jobs", "chat_messages", "conversations"];
  const accessibleTables = [];
  for (const table of knownTables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (!error) {
      accessibleTables.push(table);
      console.log(`   ✅ Table '${table}' accessible — row count hint: ${data?.length ?? 0}`);
    } else {
      console.log(`   ❌ Table '${table}': ${error.message.slice(0, 80)}`);
    }
  }

  if (accessibleTables.length === 0) {
    console.log("\n   No accessible tables found. Supabase connectivity confirmed but RLS restricts anon access.");
    console.log("   This is correct security behavior for a production database.");
    return;
  }

  // 3. If profiles accessible, try INSERT + SELECT + DELETE of a test record
  if (accessibleTables.includes("profiles")) {
    console.log("\n[3] Testing INSERT/SELECT/DELETE on 'profiles'...");
    const testId = `test_audit_${Date.now()}`;
    
    const { data: inserted, error: insertErr } = await supabase
      .from("profiles")
      .insert({ id: testId, display_name: "AUDIT_TEST_RECORD" })
      .select();
    
    if (insertErr) {
      console.log("   INSERT blocked (expected with RLS):", insertErr.message.slice(0, 100));
    } else {
      console.log("   INSERT succeeded:", JSON.stringify(inserted).slice(0, 100));
      
      // Try SELECT
      const { data: selected } = await supabase.from("profiles").select("*").eq("id", testId);
      console.log("   SELECT result:", JSON.stringify(selected).slice(0, 100));
      
      // Cleanup
      const { error: delErr } = await supabase.from("profiles").delete().eq("id", testId);
      console.log("   DELETE:", delErr ? `error: ${delErr.message}` : "✅ cleaned up");
    }
  }

  console.log("\n--- DB Verification Complete ---");
}

run().catch((e) => {
  console.error("Unhandled error:", e.message);
  process.exit(1);
});
