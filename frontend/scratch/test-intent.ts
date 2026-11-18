import { detectDocumentIntent } from "../app/lib/document-engine/intent";
import { classifyIntent } from "../app/lib/ai-orchestrator/intent-classifier";

const prompts = [
  "generate an interactive HTML dashboard for crypto trading",
  "create a single file html ui with dark mode and chart",
  "code an html web app for task tracking",
  "write an interactive dashboard in html",
  "build an html ui code generation request",
  "create an HTML UI code-generation request",
  "downloadable html file for crypto trading dashboard",
  "save as an html file for inventory management",
  "give me a downloadable .html file for personal finance"
];

for (const p of prompts) {
  const doc = detectDocumentIntent(p);
  console.log("PROMPT:", p);
  console.log(" -> isDocumentRequest:", doc.isDocumentRequest, "format:", doc.format, "archetype:", doc.archetype);
}
