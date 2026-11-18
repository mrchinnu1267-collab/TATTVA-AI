import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const token = createSignedTattvaSession({
    userId: "preview_e2e_tester",
    email: "preview_e2e_tester@tattva.ai",
    name: "Preview E2E Tester",
  });
  console.log("Generated Staging Signed Token:", token.slice(0, 30) + "...");

  const previewBase = "https://tattva-lxkiyrj09-gowthamchowdary1267-5698.vercel.app";

  console.log("\n1. Testing /api/health on staging preview...");
  const healthRes = await fetch(`${previewBase}/api/health`);
  console.log("Health Status:", healthRes.status, await healthRes.json());

  console.log("\n2. Testing /api/chat with valid session token on staging preview...");
  const chatRes = await fetch(`${previewBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `tattva_session=${encodeURIComponent(token)}`,
      "x-tattva-session": token,
    },
    body: JSON.stringify({
      messages: [
        { role: "user", content: "What is the capital of India? Answer in one short sentence." }
      ],
    }),
  });

  console.log("Chat Response HTTP Status:", chatRes.status);
  const chatData = await chatRes.json();
  console.log("Chat Response Body:", JSON.stringify(chatData, null, 2));

  if (chatRes.status === 200 && chatData.message?.content) {
    console.log("\n✅ Staging Preview Live Chat Verification: PASSED!");
  } else {
    console.log("\n❌ Staging Preview Live Chat Verification: FAILED");
  }
}

main().catch(console.error);
