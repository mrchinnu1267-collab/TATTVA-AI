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

const { data, error } = await supabase.from("conversations").select("*").order("created_at", { ascending: false }).limit(5);
console.log("Conversations rows:", data);
// Clean up any row with null title or id
if (data) {
  for (const row of data) {
    if (!row.title || row.title === "Disposable Audit Test") {
      await supabase.from("conversations").delete().eq("id", row.id);
      console.log("Cleaned row:", row.id);
    }
  }
}
