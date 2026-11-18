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

const { error } = await supabase.from("image_history").insert({});
console.log("image_history insert empty error:", error?.message);

const { error: convErr } = await supabase.from("conversations").insert({});
console.log("conversations insert empty error:", convErr?.message);
