import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateMcpServerUrl } from "../app/lib/mcp/ssrf-guard";
import { ClaudeConnectorsService } from "../app/lib/mcp/claude-connectors";
import { mcpConnectorStore } from "../app/lib/mcp/storage";
import type { McpConnector } from "../app/lib/mcp/types";

describe("Claude Connectors (MCP) Security & SSRF Guard", () => {
  test("Blocks non-HTTPS schemes", () => {
    const res = validateMcpServerUrl("http://api.example.com/sse");
    assert.equal(res.valid, false);
    assert.match(res.error || "", /HTTPS/i);
  });

  test("Blocks loopback IPv4 addresses (127.0.0.1, localhost)", () => {
    const res1 = validateMcpServerUrl("https://127.0.0.1:8080/mcp");
    assert.equal(res1.valid, false);

    const res2 = validateMcpServerUrl("https://localhost:3000/sse");
    assert.equal(res2.valid, false);
  });

  test("Blocks IPv6 loopback (::1)", () => {
    const res = validateMcpServerUrl("https://[::1]:8080/mcp");
    assert.equal(res.valid, false);
  });

  test("Blocks cloud metadata endpoints (169.254.169.254, metadata.google.internal)", () => {
    const res1 = validateMcpServerUrl("https://169.254.169.254/latest/meta-data/");
    assert.equal(res1.valid, false);

    const res2 = validateMcpServerUrl("https://metadata.google.internal/computeMetadata/v1/");
    assert.equal(res2.valid, false);
  });

  test("Blocks private RFC-1918 subnets (10.x, 172.16-31.x, 192.168.x)", () => {
    const res1 = validateMcpServerUrl("https://10.0.1.5:8080/mcp");
    assert.equal(res1.valid, false);

    const res2 = validateMcpServerUrl("https://192.168.1.100/mcp");
    assert.equal(res2.valid, false);

    const res3 = validateMcpServerUrl("https://172.20.14.2:8443/mcp");
    assert.equal(res3.valid, false);
  });

  test("Allows valid public HTTPS URLs", () => {
    const res = validateMcpServerUrl("https://mcp.github.com/v1/sse");
    assert.equal(res.valid, true);
    assert.equal(res.normalizedUrl, "https://mcp.github.com/v1/sse");
  });
});

describe("Claude Connectors Tool Permission & Read-Only Guardrails", () => {
  const service = ClaudeConnectorsService.getInstance();

  const baseConnector: McpConnector = {
    id: "test-conn-1",
    userId: "user-123",
    name: "Database Connector",
    url: "https://mcp.db.example.com",
    authType: "none",
    hasToken: false,
    status: "connected",
    enabled: true,
    readOnly: true,
    allowedTools: [],
    deniedTools: [],
    consentGiven: true,
    consentAcknowledged: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("Read-Only mode blocks mutative keywords (delete, drop, write, create, insert, update)", () => {
    assert.equal(service.isToolAllowed(baseConnector, "drop_table"), false);
    assert.equal(service.isToolAllowed(baseConnector, "delete_record"), false);
    assert.equal(service.isToolAllowed(baseConnector, "write_file"), false);
    assert.equal(service.isToolAllowed(baseConnector, "create_user"), false);
    assert.equal(service.isToolAllowed(baseConnector, "update_order"), false);
  });

  test("Read-Only mode permits safe queries and searches", () => {
    assert.equal(service.isToolAllowed(baseConnector, "query_records"), true);
    assert.equal(service.isToolAllowed(baseConnector, "list_tables"), true);
    assert.equal(service.isToolAllowed(baseConnector, "get_schema"), true);
    assert.equal(service.isToolAllowed(baseConnector, "search_index"), true);
  });

  test("Enforces explicit deniedTools list", () => {
    const customConn: McpConnector = {
      ...baseConnector,
      readOnly: false,
      deniedTools: ["export_all_data", "shutdown_server"],
    };
    assert.equal(service.isToolAllowed(customConn, "export_all_data"), false);
    assert.equal(service.isToolAllowed(customConn, "shutdown_server"), false);
    assert.equal(service.isToolAllowed(customConn, "fetch_row"), true);
  });

  test("Enforces explicit allowedTools list", () => {
    const customConn: McpConnector = {
      ...baseConnector,
      readOnly: false,
      allowedTools: ["safe_lookup", "check_status"],
    };
    assert.equal(service.isToolAllowed(customConn, "safe_lookup"), true);
    assert.equal(service.isToolAllowed(customConn, "check_status"), true);
    assert.equal(service.isToolAllowed(customConn, "delete_everything"), false);
  });
});

describe("AES-256-GCM Token Encryption & Storage", () => {
  test("Encrypts and decrypts authorization tokens accurately", () => {
    const testSecret = "mcp_sk_live_983742893748237498237498234";
    const { encryptedToken } = mcpConnectorStore.encryptToken(testSecret);

    assert.ok(encryptedToken.ciphertext && encryptedToken.iv && encryptedToken.tag);

    const decrypted = mcpConnectorStore.decryptToken({
      id: "dummy",
      userId: "dummy",
      name: "dummy",
      url: "https://example.com",
      authType: "bearer",
      status: "connected",
      enabled: true,
      readOnly: false,
      allowedTools: [],
      deniedTools: [],
      encryptedToken,
      hasToken: true,
      consentGiven: true,
      consentAcknowledged: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(decrypted, testSecret);
  });

  test("Sanitizes connector for frontend: removes encryptedToken and oauth secrets", () => {
    const full: McpConnector = {
      id: "conn-secret",
      userId: "u-1",
      name: "Secret MCP",
      url: "https://mcp.org",
      authType: "bearer",
      status: "connected",
      enabled: true,
      readOnly: false,
      allowedTools: [],
      deniedTools: [],
      encryptedToken: { iv: "iv", tag: "tag", ciphertext: "ciphertext" },
      hasToken: true,
      consentGiven: true,
      consentAcknowledged: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sanitized = mcpConnectorStore.sanitizeConnector(full);
    assert.equal((sanitized as any).encryptedToken, undefined);
    assert.equal(sanitized.hasToken, true);
    assert.equal(sanitized.id, "conn-secret");
  });
});
