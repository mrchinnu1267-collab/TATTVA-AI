import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPasswordReset() {
  console.log("========================================================================");
  console.log("🔐 TESTING REAL SUPABASE PASSWORD RESET DISPATCH");
  console.log("========================================================================");
  console.log("Supabase URL:", supabaseUrl);

  const testEmail = "gowthamchowdary1267@gmail.com";
  const redirectUrl = "http://localhost:3000/reset-password";

  console.log(`Sending reset password email to: ${testEmail}`);
  console.log(`Explicit recovery redirect URL: ${redirectUrl}`);

  const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    console.error("❌ Supabase resetPasswordForEmail Error:", error.message);
    process.exit(1);
  }

  console.log("✅ Supabase successfully dispatched the password reset email!");
  console.log("Response data:", data);
  console.log("========================================================================");
}

testPasswordReset();
