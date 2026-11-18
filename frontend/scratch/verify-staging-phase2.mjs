import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const token = createSignedTattvaSession({
    userId: "preview_e2e_tester_phase2",
    email: "preview_e2e_tester_phase2@tattva.ai",
    name: "Phase 2 Preview Tester",
  });
  console.log("Generated Staging Signed Token:", token.slice(0, 30) + "...");

  const previewBase = "https://tattva-3xtwt6mcz-gowthamchowdary1267-5698.vercel.app";

  console.log("\n1. Testing /api/health on staging preview...");
  const healthRes = await fetch(`${previewBase}/api/health`);
  console.log("Health Status:", healthRes.status, await healthRes.json());

  console.log("\n2. Testing /api/observability on staging preview...");
  const obsRes = await fetch(`${previewBase}/api/observability`, {
    headers: {
      "x-tattva-session": token,
    },
  });
  console.log("Observability Status:", obsRes.status);
  const obsData = await obsRes.json();
  console.log("Observability Data System Status:", obsData.snapshot?.systemStatus);

  console.log("\n3. Testing /api/chat with valid session token on staging preview...");
  const chatRes = await fetch(`${previewBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `tattva_session=${encodeURIComponent(token)}`,
      "x-tattva-session": token,
    },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "Write a Python function to check if a string is a palindrome. Include a docstring and 2 test assertions." }
      ],
    }),
  });

  console.log("Chat Response HTTP Status:", chatRes.status);
  const chatData = await chatRes.json();
  console.log("Chat Response Content Sample:\n", chatData.message?.content?.slice(0, 300) + "...");

  if (chatRes.status === 200 && chatData.message?.content) {
    console.log("\n✅ Staging Preview Live Chat Verification: PASSED!");
  } else {
    console.log("\n❌ Staging Preview Live Chat Verification: FAILED");
    process.exit(1);
  }
}

main().catch(console.error);
