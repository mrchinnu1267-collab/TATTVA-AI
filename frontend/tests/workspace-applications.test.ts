import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { WORKSPACE_APPS_LIST, WORKSPACE_APPS } from "../app/components/workspace/constants";
import { validateEmail, formatBytes } from "../app/api/workspace/email/send/route";

describe("PHASE 11 & 13: Seven Workspace Applications & Real Email Relay System", () => {
  test("1. All 7 Office Productivity Applications are registered and accessible", () => {
    const requiredApps = ["word", "excel", "powerpoint", "outlook", "onenote", "publisher", "access"];
    assert.strictEqual(WORKSPACE_APPS_LIST.length, 7, "Must contain exactly 7 core workspace applications");

    for (const appId of requiredApps) {
      const app = WORKSPACE_APPS[appId as keyof typeof WORKSPACE_APPS];
      assert.ok(app, `Application "${appId}" must exist in WORKSPACE_APPS`);
      assert.ok(app.name, `Application "${appId}" must have a name`);
      assert.ok(app.letter, `Application "${appId}" must have a signature letter`);
      assert.ok(app.defaultFormat, `Application "${appId}" must specify a default format`);
      assert.ok(app.supportedFormats.length > 0, `Application "${appId}" must specify supported formats`);
    }
  });

  test("2. Format Extension Verification across all 7 Applications", () => {
    assert.strictEqual(WORKSPACE_APPS.word.defaultFormat, "docx");
    assert.strictEqual(WORKSPACE_APPS.excel.defaultFormat, "xlsx");
    assert.strictEqual(WORKSPACE_APPS.powerpoint.defaultFormat, "pptx");
    assert.strictEqual(WORKSPACE_APPS.outlook.defaultFormat, "eml");
    assert.strictEqual(WORKSPACE_APPS.onenote.defaultFormat, "one");
    assert.strictEqual(WORKSPACE_APPS.publisher.defaultFormat, "pub");
    assert.strictEqual(WORKSPACE_APPS.access.defaultFormat, "accdb");
  });

  test("3. Email Address Syntax Validation (RFC 5322)", () => {
    assert.strictEqual(validateEmail("user@example.com"), true);
    assert.strictEqual(validateEmail("gowtham@tattva-ai.com"), true);
    assert.strictEqual(validateEmail("first.last+tag@sub.domain.org"), true);

    assert.strictEqual(validateEmail("invalid-email"), false);
    assert.strictEqual(validateEmail("user@"), false);
    assert.strictEqual(validateEmail("@domain.com"), false);
    assert.strictEqual(validateEmail(""), false);
  });

  test("4. Attachment Byte Formatting Utility", () => {
    assert.strictEqual(formatBytes(0), "0 Bytes");
    assert.strictEqual(formatBytes(1024), "1 KB");
    assert.strictEqual(formatBytes(1024 * 1024), "1 MB");
    assert.strictEqual(formatBytes(1024 * 1024 * 5.5), "5.5 MB");
  });
});

