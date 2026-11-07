import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

console.log("\n🚀 Running Claude Connectors (MCP) Test Suite...\n");

try {
  await jiti("./claude-connectors.test.ts");
  await jiti("./connectors-e2e.test.ts");
  console.log("\n✅ All Test Suites passed successfully!\n");
} catch (err) {
  console.error("\n❌ Test execution failed:", err);
  process.exit(1);
}

