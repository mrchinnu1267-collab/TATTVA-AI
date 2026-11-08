import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

console.log("\n🚀 Running TATTVA AI Test Suite...\n");

try {
  await jiti("./auth-redirect.test.ts");
  await jiti("./claude-connectors.test.ts");
  await jiti("./connectors-e2e.test.ts");
  await jiti("./document-reader.test.ts");
  await jiti("./human-intelligence.test.ts");
  await jiti("./research-file-engine.test.ts");
  console.log("\n✅ All Test Suites passed successfully!\n");
} catch (err) {
  console.error("\n❌ Test execution failed:", err);
  process.exit(1);
}
