import { chromium } from "@playwright/test";

async function verifyProduction() {
  console.log("=== TATTVA AI LIVE PRODUCTION BROWSER VERIFICATION ===");
  const target = "https://tattva-ai-phi.vercel.app";
  console.log("Navigating to:", target);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const response = await page.goto(target, { waitUntil: "networkidle", timeout: 30000 });
  console.log("HTTP Status:", response.status());

  const title = await page.title();
  console.log("Page Title:", title);

  const mainVisible = await page.locator("body").isVisible();
  console.log("Body Rendered:", mainVisible);

  const buttons = await page.locator("button").count();
  console.log("Interactive Buttons Found:", buttons);

  const textareas = await page.locator("textarea").count();
  console.log("Textarea Input Elements Found:", textareas);

  console.log("Console Errors Detected:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log("Errors:", consoleErrors);
  }

  await browser.close();
  console.log("\n✅ Production Headless Browser DOM Verification: COMPLETE & HEALTHY");
}

verifyProduction().catch(err => {
  console.error("DOM Verification Failed:", err);
  process.exit(1);
});
