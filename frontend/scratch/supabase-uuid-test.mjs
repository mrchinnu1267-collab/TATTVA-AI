import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

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

const validUuid = randomUUID();
const { data, error } = await supabase.from("conversations").insert({
  id: validUuid,
  title: "Disposable Audit Test",
  created_at: new Date().toISOString()
});

if (error) {
  console.log("UUID insert result: BLOCKED/RESTRICTED BY RLS:", error.message);
} else {
  console.log("UUID insert result: SUCCESS. Cleaning up test row...");
  await supabase.from("conversations").delete().eq("id", validUuid);
  console.log("Cleanup complete.");
}
