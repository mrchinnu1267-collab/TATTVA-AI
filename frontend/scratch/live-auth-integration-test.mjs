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

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseAnonKey = envVars["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

console.log("=== SUPABASE LIVE AUTHENTICATED SESSION INTEGRATION TEST ===");
console.log("Supabase URL configured:", Boolean(supabaseUrl));
console.log("Supabase Publishable Key configured:", Boolean(supabaseAnonKey));
console.log("Supabase Service Role Key configured in .env.local:", Boolean(envVars["SUPABASE_SERVICE_ROLE_KEY"]));

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. Test unauthenticated (anon) client access
console.log("\n--- TEST 1: Unauthenticated (anon) Query Verification ---");
const { data: anonJobData, error: anonJobErr } = await supabase
  .from("image_generation_jobs")
  .select("*")
  .limit(1);
console.log("Anon select on image_generation_jobs:", anonJobErr ? `BLOCKED / NOT FOUND (${anonJobErr.message})` : `FOUND ${anonJobData?.length}`);

const { data: anonWsData, error: anonWsErr } = await supabase
  .from("workspace_items")
  .select("*")
  .limit(1);
console.log("Anon select on workspace_items:", anonWsErr ? `BLOCKED / NOT FOUND (${anonWsErr.message})` : `FOUND ${anonWsData?.length}`);

// 2. Test live Supabase Auth signup to obtain actual authenticated JWT session
console.log("\n--- TEST 2: Live Supabase Auth Session Acquisition ---");
const testEmail = `audit_test_user_${Date.now()}@tattva.ai`;
const testPassword = `AuditPass!987_${Date.now()}`;
let userJwt = null;
let userUuid = null;

try {
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpErr) {
    console.log("Sign up result:", signUpErr.message);
  } else if (signUpData?.session) {
    userJwt = signUpData.session.access_token;
    userUuid = signUpData.user?.id;
    console.log("Sign up succeeded! Acquired live Supabase JWT.");
    console.log("User UUID from auth.users:", userUuid);
  } else {
    console.log("User created, confirmation required (no direct session).");
  }
} catch (err) {
  console.log("Auth exception:", err.message);
}

// 3. If session acquired, test authenticated queries with live JWT
if (userJwt && userUuid) {
  console.log("\n--- TEST 3: Authenticated Client with Real JWT Token ---");
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });

  // Verify auth.getUser() returns the exact expected UUID
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  console.log("authClient.auth.getUser() userId:", userData?.user?.id);
  console.log("Matches acquired userUuid:", userData?.user?.id === userUuid);

  // Check query on conversations (which exists in DB)
  const disposableConvId = crypto.randomUUID();
  const { data: insData, error: insErr } = await authClient
    .from("conversations")
    .insert({
      id: disposableConvId,
      title: "Authenticated Integration Audit Test",
    })
    .select();

  console.log("Authenticated insert to existing table (conversations):", insErr ? `Error: ${insErr.message}` : "SUCCESS (Permitted for authenticated user)");

  if (!insErr) {
    // Clean up
    await authClient.from("conversations").delete().eq("id", disposableConvId);
    console.log("Disposable test row cleaned up successfully.");
  }

  // Probe target migration tables
  const { error: wsCheckErr } = await authClient.from("workspace_items").select("*").limit(1);
  console.log("Target table workspace_items status:", wsCheckErr?.message);

  const { error: jobCheckErr } = await authClient.from("image_generation_jobs").select("*").limit(1);
  console.log("Target table image_generation_jobs status:", jobCheckErr?.message);
} else {
  console.log("\nNote: Supabase instance requires email confirmation or disable signups.");
}

console.log("\n=== TEST COMPLETED ===");
