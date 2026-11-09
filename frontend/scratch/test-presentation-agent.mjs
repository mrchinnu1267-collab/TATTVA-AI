// Test PowerPoint Studio Gemini Agent Endpoint
async function runTest() {
  const payload = {
    command: "Create an 8-slide presentation about Agentic AI using a professional white theme",
    currentSlideNumber: 1,
    presentation: {
      title: "SMART-INSPECT",
      theme: { id: "dark_modern" },
      slides: [
        { title: "Introduction", category: "FOUNDATIONS", bullets: ["Overview"], notes: "Notes" }
      ]
    }
  };

  console.log("Testing POST /api/presentation/agent with command:", payload.command);
  try {
    const res = await fetch("http://localhost:3000/api/presentation/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Success:", data.success);
    console.log("Steps Count:", data.steps?.length);
    if (data.steps && data.steps.length > 0) {
      console.log("First Step:", JSON.stringify(data.steps[0], null, 2));
    }
    console.log("Reply:", data.reply);
  } catch (err) {
    console.error("Fetch failed (dev server may be offline or starting):", err.message);
  }
}

runTest();

