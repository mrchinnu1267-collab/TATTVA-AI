import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mcpConnectorStore } from "../app/lib/mcp/storage";
import { ClaudeConnectorsService } from "../app/lib/mcp/claude-connectors";
import type { ConnectorChatRequest } from "../app/lib/mcp/types";

describe("Claude Connectors (MCP) End-to-End Lifecycle & Chat Execution", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const testUserId = "e2e_user_" + Date.now();
  const service = ClaudeConnectorsService.getInstance();

  let capturedAnthropicRequest: {
    url: string;
    headers: Record<string, string>;
    body: any;
  } | null = null;

  before(() => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-api03-mock-test-key-for-e2e";

    // Mock Anthropic API endpoint
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === "string" ? input : input.toString();

      if (urlStr.includes("api.anthropic.com/v1/messages")) {
        const headers: Record<string, string> = {};
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => {
              headers[k.toLowerCase()] = v;
            });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => {
              headers[k.toLowerCase()] = v;
            });
          } else {
            Object.entries(init.headers).forEach(([k, v]) => {
              headers[k.toLowerCase()] = String(v);
            });
          }
        }

        const bodyJson = init?.body ? JSON.parse(init.body as string) : {};
        capturedAnthropicRequest = {
          url: urlStr,
          headers,
          body: bodyJson,
        };

        // Simulated Anthropic MCP response with text and tool call execution
        const mockResponseBody = {
          id: "msg_mock_123456",
          type: "message",
          role: "assistant",
          model: "claude-3-5-sonnet-20241022",
          content: [
            {
              type: "tool_use",
              id: "call_mcp_gh_1",
              name: "search_repositories",
              input: { query: "TATTVA AI", limit: 3 },
            },
            {
              type: "text",
              text: "I used the GitHub MCP connector to search for repositories. Here are the latest results for TATTVA AI.",
            },
          ],
          stop_reason: "end_turn",
          usage: {
            input_tokens: 42,
            output_tokens: 38,
          },
        };

        return new Response(JSON.stringify(mockResponseBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default mock for connectivity test
      return new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  test("Step 1: Add and Store Claude MCP Connector with encrypted token", async () => {
    const rawToken = "ghp_secure_personal_access_token_12345";

    const connector = await mcpConnectorStore.addConnector(testUserId, {
      name: "GitHub MCP Server",
      url: "https://mcp.github.com/v1/sse",
      authToken: rawToken,
      readOnly: true,
      consentAcknowledged: true,
    });

    assert.ok(connector.id);
    assert.equal(connector.name, "GitHub MCP Server");
    assert.equal(connector.url, "https://mcp.github.com/v1/sse");
    assert.equal(connector.enabled, true);
    assert.equal(connector.readOnly, true);
    assert.equal(connector.hasToken, true);
    assert.notEqual(connector.encryptedToken as unknown, rawToken);

    // Verify token decrypts properly on server side
    const decrypted = mcpConnectorStore.decryptToken(connector);
    assert.equal(decrypted, rawToken);
  });

  test("Step 2: Update permissions & enable connector", async () => {
    const connectors = await mcpConnectorStore.getConnectors(testUserId);
    assert.equal(connectors.length, 1);
    const conn = connectors[0];

    const updated = await mcpConnectorStore.updateConnector(testUserId, conn.id, {
      allowedTools: ["search_repositories", "get_file_contents"],
      deniedTools: ["delete_repo", "drop_db"],
    });

    assert.ok(updated);
    assert.deepEqual(updated?.allowedTools, ["search_repositories", "get_file_contents"]);
    assert.deepEqual(updated?.deniedTools, ["delete_repo", "drop_db"]);
  });

  test("Step 3: Execute Chat with active MCP connector and verify headers and payload", async () => {
    const connectors = await mcpConnectorStore.getConnectors(testUserId);
    const connId = connectors[0].id;

    const chatReq: ConnectorChatRequest = {
      messages: [
        { role: "user", content: "Search for TATTVA AI repository on GitHub" },
      ],
      connectorIds: [connId],
      model: "claude-3-5-sonnet-20241022",
    };

    const chatResult = await service.executeChat(testUserId, chatReq);

    // Verify the simulated Anthropic call was invoked properly
    assert.ok(capturedAnthropicRequest);
    assert.match(capturedAnthropicRequest.url, /api\.anthropic\.com\/v1\/messages/);

    // Verify the required Anthropic Beta header is present
    const betaHeader = capturedAnthropicRequest.headers["anthropic-beta"];
    assert.ok(betaHeader);
    assert.match(betaHeader, /mcp-client-2025-11-20/);

    // Verify mcp_servers configuration
    const mcpServers = capturedAnthropicRequest.body.mcp_servers;
    assert.ok(Array.isArray(mcpServers));
    assert.equal(mcpServers.length, 1);
    assert.equal(mcpServers[0].type, "url");
    assert.equal(mcpServers[0].url, "https://mcp.github.com/v1/sse");
    assert.equal(mcpServers[0].authorization_token, "ghp_secure_personal_access_token_12345");

    // Verify matching mcp_toolset entry in tools array
    const tools = capturedAnthropicRequest.body.tools;
    assert.ok(Array.isArray(tools));
    assert.equal(tools.length, 1);
    assert.equal(tools[0].type, "mcp_toolset");
    assert.equal(tools[0].mcp_server_name, mcpServers[0].name);

    // Verify response contains text and reflected tool call
    assert.match(chatResult.text, /GitHub MCP connector to search/);
    assert.equal(chatResult.toolCalls.length, 1);
    assert.equal(chatResult.toolCalls[0].toolName, "search_repositories");
    assert.deepEqual(chatResult.toolCalls[0].input, { query: "TATTVA AI", limit: 3 });
  });

  test("Step 4: Disconnect and Purge Connector", async () => {
    const connectors = await mcpConnectorStore.getConnectors(testUserId);
    const connId = connectors[0].id;

    const deleted = await mcpConnectorStore.deleteConnector(testUserId, connId);
    assert.equal(deleted, true);

    const afterList = await mcpConnectorStore.getConnectors(testUserId);
    assert.equal(afterList.length, 0);
  });
});
