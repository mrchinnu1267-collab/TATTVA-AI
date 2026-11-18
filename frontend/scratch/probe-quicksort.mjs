import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { aiOrchestrator } = jiti("../app/lib/ai-orchestrator/index.ts");

(async () => {
  const conv = [
    { role: 'user', content: 'How does the Quicksort algorithm work?' },
    { role: 'assistant', content: 'Quicksort is a divide-and-conquer sorting algorithm that selects a pivot element and partitions array elements into two sub-arrays.' },
    { role: 'user', content: 'What is its worst-case time complexity and how can you avoid it?' },
  ];
  const res = await aiOrchestrator.processRequest({ messages: conv, context: { userId: 'test' } });
  console.log('MODEL USED:', res.modelUsed);
  console.log('CONTENT:\n', res.content);
})();
