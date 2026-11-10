import { validateEmail, formatBytes, buildTattvaHtmlTemplate, POST } from "../app/api/workspace/email/send/route.ts";
import assert from "node:assert/strict";

console.log("=== TATTVA AI OUTLOOK STUDIO - REAL EMAIL SENDING TEST SUITE ===");

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

// 1. RFC 5322 Email Validation Tests
await test("validateEmail: Valid simple email addresses", () => {
  assert.equal(validateEmail("user@example.com"), true);
  assert.equal(validateEmail("gowtham@tattva-ai.com"), true);
  assert.equal(validateEmail("support@tattva.ai"), true);
  assert.equal(validateEmail("first.last+tag@sub.domain.co.uk"), true);
});

await test("validateEmail: Rejects malformed and injection payloads", () => {
  assert.equal(validateEmail("plainaddress"), false);
  assert.equal(validateEmail("@missinguser.com"), false);
  assert.equal(validateEmail("missingdomain@"), false);
  assert.equal(validateEmail("spaces in@domain.com"), false);
  assert.equal(validateEmail(""), false);
  assert.equal(validateEmail(null), false);
  assert.equal(validateEmail(undefined), false);
});

// 2. Format Bytes Tests
await test("formatBytes: Accurately converts bytes into human-readable strings", () => {
  assert.equal(formatBytes(0), "0 Bytes");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1048576), "1 MB");
  assert.equal(formatBytes(26214400), "25 MB");
});

// 3. HTML Template Verification
await test("buildTattvaHtmlTemplate: Renders TATTVA AI branded email with attachments & escaped body", () => {
  const html = buildTattvaHtmlTemplate({
    subject: "Q4 Architecture Sign-off",
    body: "Hello Team,\n\nHere is the report: <Important> & verifiable.",
    senderName: "Kotapati Gowtham Chowdary",
    attachments: [
      {
        filename: "Q4_Report.pdf",
        content: "dummyBase64",
        sizeBytes: 154000,
      },
      {
        filename: "Model_Evaluation.xlsx",
        content: "dummyBase64",
        sizeBytes: 42000,
      },
    ],
  });

  assert.ok(html.includes("TATTVA AI"), "Should contain TATTVA AI branding");
  assert.ok(html.includes("Outlook Studio"), "Should identify Outlook Studio");
  assert.ok(html.includes("Q4 Architecture Sign-off"), "Should render subject");
  assert.ok(html.includes("&lt;Important&gt; &amp; verifiable."), "Should escape HTML injection");
  assert.ok(html.includes("Q4_Report.pdf"), "Should list attached PDF");
  assert.ok(html.includes("Model_Evaluation.xlsx"), "Should list attached XLSX");
  assert.ok(html.includes("Zero-Trust Cloud Workspace"), "Should have official security footer");
});

// 4. Allowed Attachments Set
await test("Attachment Extension Verification: Enforces official enterprise extensions", () => {
  const ALLOWED = new Set(["pdf", "docx", "xlsx", "pptx", "txt", "csv", "png", "jpg", "jpeg", "zip"]);
  const validFiles = [
    "Annual_Report.pdf",
    "Quarterly_Financials.xlsx",
    "Pitch_Deck.pptx",
    "Requirements.docx",
    "Data.csv",
    "Notes.txt",
    "Diagram.png",
    "Backup.zip",
  ];
  for (const f of validFiles) {
    const ext = f.split(".").pop().toLowerCase();
    assert.ok(ALLOWED.has(ext), `Extension .${ext} must be permitted`);
  }

  const invalidFiles = ["script.exe", "trojan.bat", "eval.js", "payload.sh", "install.msi"];
  for (const f of invalidFiles) {
    const ext = f.split(".").pop().toLowerCase();
    assert.ok(!ALLOWED.has(ext), `Extension .${ext} must be blocked`);
  }
});

// 5. POST API Route Handler End-to-End Tests
await test("POST /api/workspace/email/send: Rejects missing recipient", async () => {
  const req = new Request("http://localhost/api/workspace/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "",
      subject: "Test Subject",
      body: "Test Body",
    }),
  });
  const res = await POST(req);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.success, false);
  assert.ok(json.error.includes("recipient"));
});

await test("POST /api/workspace/email/send: Rejects invalid recipient format", async () => {
  const req = new Request("http://localhost/api/workspace/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "not-an-email",
      subject: "Test Subject",
      body: "Test Body",
    }),
  });
  const res = await POST(req);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.success, false);
  assert.ok(json.error.includes("Invalid recipient address"));
});

await test("POST /api/workspace/email/send: Rejects disallowed file extension", async () => {
  const req = new Request("http://localhost/api/workspace/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "client@example.com",
      subject: "Script Attachment",
      body: "Here is your file",
      attachments: [{ filename: "payload.exe", content: "TVqQAAMAAAAEAAAA" }],
    }),
  });
  const res = await POST(req);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.success, false);
  assert.ok(json.error.includes(".exe' is not permitted"));
});

await test("POST /api/workspace/email/send: Valid payload dispatches successfully", async () => {
  const req = new Request("http://localhost/api/workspace/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: ["recipient@example.com", "partner@tattva.ai"],
      cc: ["audit@tattva.ai"],
      subject: "TATTVA AI Workspace Product Review",
      body: "Please review the attached project specifications and confirm sign-off.",
      senderName: "Kotapati Gowtham Chowdary",
      attachments: [
        {
          filename: "Project_Specs.pdf",
          content: "data:application/pdf;base64,JVBERi0xLjQK",
          sizeBytes: 12040,
        },
      ],
    }),
  });
  const res = await POST(req);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.success, true);
  assert.ok(json.email);
  assert.equal(json.email.subject, "TATTVA AI Workspace Product Review");
  assert.equal(json.email.to.length, 2);
  assert.equal(json.email.cc.length, 1);
  assert.equal(json.email.attachments[0].name, "Project_Specs.pdf");
});

console.log(`\nResults: ${passed}/${total} unit and API integration checks passed.\n`);
if (passed !== total) process.exit(1);
