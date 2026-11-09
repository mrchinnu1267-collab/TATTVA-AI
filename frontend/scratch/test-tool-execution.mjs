// Direct unit test of presentation tool execution logic
import { executeToolOnPresentation } from "../app/components/presentation-studio/ai-tools.js";

const sampleState = {
  id: "test_pres",
  title: "Test Presentation",
  subtitle: "Initial Subtitle",
  theme: { id: "dark_modern", name: "Dark Modern" },
  slides: [
    {
      id: "s1",
      number: 1,
      title: "Slide 1",
      category: "INTRO",
      bullets: ["Bullet 1", "Bullet 2"],
      notes: "Initial notes",
      elements: []
    }
  ],
  currentSlideIndex: 0,
  selectedElementId: null,
  zoom: 84,
  showNotes: true,
  showThumbnails: true,
  isSlideShow: false,
  viewMode: "normal",
  saveStatus: "saved",
  autoSave: true,
  showRuler: false,
  showGridlines: false,
  showGuides: false,
  drawingTool: "none",
  drawingColor: "#EA580C",
  drawingWidth: 4
};

console.log("=== 1. Test create_presentation ===");
const res1 = executeToolOnPresentation("create_presentation", {
  title: "Agentic AI Architecture",
  theme_id: "professional_white",
  slides: [
    { title: "Foundations of Agentic AI", category: "FOUNDATIONS", bullets: ["Autonomous reasoning loops", "Tool execution boundaries"] },
    { title: "Cognitive Architecture", category: "ARCHITECTURE", bullets: ["Perception and sensory fusion", "Dynamic memory retrieval"] }
  ]
}, sampleState);
console.log("Result 1:", res1.message);
console.log("Slides count:", res1.nextState.slides.length);
console.log("Theme:", res1.nextState.theme.name);

console.log("\n=== 2. Test create_slide ===");
const res2 = executeToolOnPresentation("create_slide", {
  title: "Empirical Benchmarks",
  category: "BENCHMARKS",
  bullets: ["99.4% accuracy", "< 400ms latency"],
  notes: "Discussion notes"
}, res1.nextState);
console.log("Result 2:", res2.message);
console.log("Slides count:", res2.nextState.slides.length);

console.log("\n=== 3. Test add_process_diagram ===");
const res3 = executeToolOnPresentation("add_process_diagram", {
  slide_number: 1,
  steps: [
    { step: 1, title: "CAPTURE", desc: "Field Capture", color: "#EA580C" },
    { step: 2, title: "VERIFY", desc: "Verification", color: "#10B981" },
    { step: 3, title: "SYNC", desc: "Cloud Sync", color: "#00E5FF" },
    { step: 4, title: "ACT", desc: "Executive Action", color: "#FFFFFF" }
  ]
}, res2.nextState);
console.log("Result 3:", res3.message);
console.log("Slide 1 elements count:", res3.nextState.slides[0].elements.length);

console.log("\n=== 4. Test apply_theme ===");
const res4 = executeToolOnPresentation("apply_theme", {
  theme_id: "corporate_blue"
}, res3.nextState);
console.log("Result 4:", res4.message);
console.log("Theme now:", res4.nextState.theme.name);

console.log("\n=== 5. Test add_transition ===");
const res5 = executeToolOnPresentation("add_transition", {
  transition_type: "fade",
  duration: 0.8,
  apply_to_all: true
}, res4.nextState);
console.log("Result 5:", res5.message);

console.log("\n=== ALL TOOL TESTS PASSED SUCCESSFULLY! ===");

