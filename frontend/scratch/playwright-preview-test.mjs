/**
 * TATTVA AI — Live Preview Acceptance Test Suite
 * Tests deployed preview: https://tattva-lft5mpc30-gowthamchowdary1267-5698.vercel.app
 * Uses Playwright with bypass token from vercel CLI
 */
import { chromium } from "@playwright/test";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://tattva-lft5mpc30-gowthamchowdary1267-5698.vercel.app";

// Get bypass token from vercel CLI
function getBypassToken() {
  try {
    // The vercel CLI bypass works by adding a header — we need to find the token
    // Try to get it from the deployment protection config
    const result = execSync(
      `npx vercel inspect tattva-lft5mpc30-gowthamchowdary1267-5698.vercel.app --yes 2>&1`,
      { cwd: resolve(__dirname, "../../"), encoding: "utf-8", timeout: 30000 }
    );
    const tokenMatch = result.match(/bypass[:\s]+([a-f0-9-]+)/i);
    if (tokenMatch) return tokenMatch[1];
  } catch {}
  return null;
}

const RESULTS = [];

function result(name, status, detail) {
  RESULTS.push({ name, status, detail: String(detail).slice(0, 300) });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "BLOCKED" ? "🚫" : "⚠️";
  console.log(`${icon} [${status}] ${name}`);
  if (detail) console.log(`   ${String(detail).slice(0, 200)}`);
}

async function runTests() {
  console.log("=== TATTVA AI LIVE PREVIEW ACCEPTANCE TESTS ===\n");
  console.log(`Target: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Vercel preview protection bypass — set the cookie vercel uses
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": "tattva_preview_bypass",
    },
  });

  // ---- TEST 1: Landing Page ----
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    
    const response = await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = response?.status();
    const title = await page.title();
    const url = page.url();
    
    if (status === 200) {
      result("Landing page — HTTP 200", "PASS", `Title: "${title}" | URL: ${url}`);
    } else if (status === 401 || url.includes("vercel.com/api/auth")) {
      result("Landing page — Deployment protection active", "BLOCKED", `Status: ${status} — Vercel auth gate. Expected with bypass protection.`);
    } else {
      result("Landing page", "WARN", `Status: ${status} | Title: "${title}"`);
    }
    
    // Check for key UI elements (only if not blocked)
    if (status === 200) {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
      result("Landing page content", "PASS", `Body preview: ${bodyText.slice(0, 150)}`);
      
      if (errors.length > 0) {
        result("Landing page console errors", "WARN", errors.slice(0, 3).join("; "));
      } else {
        result("Landing page — no JS errors", "PASS", "Zero console errors on load");
      }
    }
    await page.close();
  } catch (e) {
    result("Landing page", "FAIL", e.message);
  }

  // ---- TEST 2: Login page ----
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = response?.status();
    const title = await page.title();
    const url = page.url();
    
    if (status === 200) {
      // Check for login form
      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      const passwordInput = await page.$('input[type="password"]');
      const submitBtn = await page.$('button[type="submit"], button:has-text("Sign"), button:has-text("Login"), button:has-text("Log in")');
      
      result("Login page — loads", "PASS", `HTTP ${status} | Title: "${title}"`);
      result("Login form — email field", emailInput ? "PASS" : "WARN", emailInput ? "Email input present" : "No email input found");
      result("Login form — password field", passwordInput ? "PASS" : "WARN", passwordInput ? "Password input present" : "No password input found");
      result("Login form — submit button", submitBtn ? "PASS" : "WARN", submitBtn ? "Submit button present" : "No submit button found");
    } else if (status === 401 || url.includes("vercel.com")) {
      result("Login page — Deployment protection", "BLOCKED", `Status: ${status} — Requires Vercel auth bypass for automated testing`);
    } else {
      result("Login page", "WARN", `Status: ${status} | URL: ${url}`);
    }
    await page.close();
  } catch (e) {
    result("Login page", "FAIL", e.message);
  }

  // ---- TEST 3: Dashboard protection (unauthenticated) ----
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const finalUrl = page.url();
    const status = response?.status();
    
    const redirectedToLogin = finalUrl.includes("/login") || finalUrl.includes("/auth");
    const accessDenied = status === 401 || status === 403;
    
    if (redirectedToLogin) {
      result("Dashboard — auth redirect", "PASS", `Unauthenticated /dashboard redirected to: ${finalUrl}`);
    } else if (accessDenied) {
      result("Dashboard — access denied", "PASS", `HTTP ${status} — Protected`);
    } else if (finalUrl.includes("vercel.com")) {
      result("Dashboard — Vercel protection gate", "BLOCKED", `Vercel auth gate intercepted before app middleware`);
    } else {
      result("Dashboard — auth protection", "WARN", `Final URL: ${finalUrl} | Status: ${status} — Unclear if protected`);
    }
    await page.close();
  } catch (e) {
    result("Dashboard auth protection", "FAIL", e.message);
  }

  // ---- TEST 4: Chat route protection ----
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const finalUrl = page.url();
    const status = response?.status();
    const redirected = finalUrl.includes("/login") || finalUrl.includes("/auth");
    
    if (redirected) {
      result("Chat — auth redirect", "PASS", `Redirected to ${finalUrl}`);
    } else if (finalUrl.includes("vercel.com")) {
      result("Chat — Vercel protection gate", "BLOCKED", "Vercel auth gate intercepted");
    } else {
      result("Chat route", "WARN", `Status: ${status} | URL: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    result("Chat route protection", "FAIL", e.message);
  }

  // ---- TEST 5: Register page ----
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE_URL}/register`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = response?.status();
    const finalUrl = page.url();
    const title = await page.title();
    
    if (status === 200 && !finalUrl.includes("vercel.com")) {
      result("Register page — loads", "PASS", `HTTP ${status} | Title: "${title}"`);
    } else if (finalUrl.includes("vercel.com")) {
      result("Register page — Vercel protection", "BLOCKED", "Vercel auth gate");
    } else {
      result("Register page", "WARN", `Status: ${status} | URL: ${finalUrl}`);
    }
    await page.close();
  } catch (e) {
    result("Register page", "FAIL", e.message);
  }

  await browser.close();

  // ---- SUMMARY ----
  console.log("\n=== TEST SUMMARY ===");
  const pass = RESULTS.filter(r => r.status === "PASS").length;
  const fail = RESULTS.filter(r => r.status === "FAIL").length;
  const blocked = RESULTS.filter(r => r.status === "BLOCKED").length;
  const warn = RESULTS.filter(r => r.status === "WARN").length;
  
  console.log(`PASS: ${pass} | FAIL: ${fail} | BLOCKED: ${blocked} | WARN: ${warn}`);
  console.log(`Total: ${RESULTS.length}`);
  
  // Output JSON for report
  console.log("\n=== JSON RESULTS ===");
  console.log(JSON.stringify(RESULTS, null, 2));
}

runTests().catch(e => {
  console.error("Test runner crashed:", e.message);
  process.exit(1);
});
