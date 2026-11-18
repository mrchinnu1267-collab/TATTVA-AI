/**
 * Phase 46 Comprehensive Test Suite: Customer Support & User Feedback
 * Tests TicketManager, FAQManager, FeedbackCollector, PII scrubbing, tenant privacy, and Tool Registry.
 */

import assert from "node:assert";
import { CustomerSupportEngine } from "../app/lib/support/index.js";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.js";

async function runPhase46Tests() {
  console.log("=== STARTING PHASE 46 CUSTOMER SUPPORT & USER FEEDBACK TEST SUITE ===");

  const engine = CustomerSupportEngine.getInstance();
  assert.ok(engine, "CustomerSupportEngine must be instantiated");

  // 1. Ticket Creation & PII Scrubbing
  console.log("\n[Test 1] Ticket Creation and Automatic PII Protection...");
  const user1 = "usr_phase46_alpha";
  const user2 = "usr_phase46_beta";

  const rawDescriptionWithPII = "My api key is broken, please help. Also my phone is 415-555-0199 and my SSN is 123-45-6789.";
  const ticket1 = await engine.createTicket({
    userId: user1,
    userEmail: "alpha@tattva.ai",
    subject: "API Gateway Timeout Issue",
    description: rawDescriptionWithPII,
    category: "technical",
    priority: "high",
  });

  assert.ok(ticket1.id.startsWith("tck_"), "Ticket ID must start with tck_");
  assert.ok(ticket1.ticketNumber.startsWith("TCK-"), "Ticket number format must be TCK-YYYY-XXXX");
  assert.strictEqual(ticket1.status, "open", "Initial status should be open");
  assert.strictEqual(ticket1.priority, "high", "Priority should match");
  assert.strictEqual(ticket1.category, "technical", "Category should match");
  assert.strictEqual(ticket1.userId, user1, "User ID should match");
  // Check PII scrubbing
  assert.ok(!ticket1.description.includes("123-45-6789"), "SSN should be redacted from ticket description");
  assert.ok(ticket1.description.includes("[REDACTED_SSN]"), "SSN should be replaced with redaction placeholder");
  console.log("  ✓ Ticket created with formatted ID and scrubbed PII:", ticket1.ticketNumber);

  // 2. Tenant Privacy & Security
  console.log("\n[Test 2] Cross-Tenant Privacy & Access Control...");
  const user1Tickets = engine.listTickets({ userId: user1 });
  assert.ok(user1Tickets.some(t => t.id === ticket1.id), "User 1 must see their own tickets");

  const user2Tickets = engine.listTickets({ userId: user2 });
  assert.ok(!user2Tickets.some(t => t.id === ticket1.id), "User 2 MUST NOT see User 1's ticket in list");

  const ticket1FromUser2 = engine.getTicket(ticket1.id, user2);
  assert.strictEqual(ticket1FromUser2, null, "User 2 cannot retrieve User 1's ticket");

  const ticket1FromUser1 = engine.getTicket(ticket1.id, user1);
  assert.ok(ticket1FromUser1, "User 1 can retrieve their ticket");
  console.log("  ✓ Cross-tenant access isolation verified");

  // 3. Threaded Messages & Replies
  console.log("\n[Test 3] Threaded Replies & Lifecycle Updates...");
  const reply1 = await engine.replyToTicket({
    ticketId: ticket1.id,
    sender: "support_agent",
    senderName: "Agent Sarah",
    message: "We are investigating the API gateway latency now. Could you share your cluster region?",
    requestingUserId: "admin",
  });
  assert.ok(reply1, "Support agent reply should succeed");
  assert.strictEqual(reply1.sender, "support_agent", "Sender should be support_agent");

  const reply2 = await engine.replyToTicket({
    ticketId: ticket1.id,
    sender: "user",
    senderName: "Alpha User",
    message: "It's the us-east region.",
    requestingUserId: user1,
  });
  assert.ok(reply2, "User reply should succeed");

  const updatedTicket = await engine.updateTicketStatus(ticket1.id, "resolved", user1);
  assert.strictEqual(updatedTicket.status, "resolved", "Status should be updated to resolved");
  assert.strictEqual(updatedTicket.messages.length, 3, "Ticket should have 3 messages total");
  console.log("  ✓ Threaded communication and status update verified (Messages count: 3)");

  // 4. Knowledge Base & FAQs
  console.log("\n[Test 4] Knowledge Base Search & Voting...");
  const allFaqs = engine.listFaqs();
  assert.ok(allFaqs.length >= 5, "Should have default knowledge base articles");

  const searchResults = engine.searchFaqs("models");
  assert.ok(searchResults.length >= 1, "Should find articles for query 'models'");
  const modelFaq = searchResults[0];
  const initialVotes = modelFaq.helpfulVotes ?? modelFaq.helpfulCount ?? 0;

  const voted = engine.voteFaqHelpful(modelFaq.slug);
  assert.strictEqual(voted, true, "Upvoting article should succeed");
  const rechecked = engine.getFaq(modelFaq.slug);
  const recheckedVotes = rechecked.helpfulVotes ?? rechecked.helpfulCount;
  assert.strictEqual(recheckedVotes, initialVotes + 1, "Helpful votes must increment");
  console.log(`  ✓ FAQ search returned ${searchResults.length} articles; vote count incremented to ${rechecked.helpfulVotes}`);

  // 5. User Feedback & CSAT Telemetry
  console.log("\n[Test 5] User Satisfaction (CSAT) & Sentiment Classification...");
  const fbPos = await engine.submitFeedback({
    userId: user1,
    rating: 5,
    category: "ai_quality",
    feedbackText: "Outstanding response latency and accurate Python coding capabilities!",
  });
  assert.strictEqual(fbPos.rating, 5, "Rating should be 5");
  assert.strictEqual(fbPos.sentiment, "positive", "Rating 5 must be tagged positive sentiment");

  const fbNeg = await engine.submitFeedback({
    userId: user2,
    rating: 2,
    category: "performance",
    feedbackText: "Encountered a slight delay during peak hours.",
  });
  assert.strictEqual(fbNeg.rating, 2, "Rating should be 2");
  assert.strictEqual(fbNeg.sentiment, "negative", "Rating <= 2 must be tagged negative sentiment");

  const fbNeutral = await engine.submitFeedback({
    userId: "usr_neutral",
    rating: 3,
    category: "general",
    feedbackText: "Decent platform overall.",
  });
  assert.strictEqual(fbNeutral.sentiment, "neutral", "Rating 3 must be tagged neutral sentiment");

  const metrics = engine.getMetrics();
  assert.ok(metrics.totalFeedback >= 3, "Total feedback count should be recorded");
  assert.ok(metrics.averageSatisfactionScore > 0, "Average satisfaction score must be computed");
  console.log(`  ✓ Feedback collected. CSAT Avg: ${metrics.averageSatisfactionScore.toFixed(2)} / 5.0 (Total: ${metrics.totalFeedback})`);

  // 6. Centralized Tool Registry Integration
  console.log("\n[Test 6] Tool Registry Verification for Phase 46 Tools...");
  const toolCreateTicket = centralizedToolRegistry.getTool("create_support_ticket");
  assert.ok(toolCreateTicket, "Tool 'create_support_ticket' must be registered");

  const toolSearchKb = centralizedToolRegistry.getTool("search_knowledge_base");
  assert.ok(toolSearchKb, "Tool 'search_knowledge_base' must be registered");

  const toolFeedback = centralizedToolRegistry.getTool("submit_user_feedback");
  assert.ok(toolFeedback, "Tool 'submit_user_feedback' must be registered");

  // Execute tool: create_support_ticket
  const executionContext = {
    userId: "agent_tester",
    userEmail: "tester@tattva.ai",
    roles: ["user"],
    sessionId: "sess_p46",
    workspaceId: "ws_p46",
  };

  const ticketExecRes = await toolCreateTicket.execute(
    {
      subject: "Test Agent Ticket",
      description: "Automated ticket created by tool registry test.",
      category: "technical",
      priority: "normal",
    },
    executionContext
  );
  assert.strictEqual(ticketExecRes.success, true, "Tool create_support_ticket should execute successfully");
  assert.ok(ticketExecRes.output.ticketNumber.startsWith("TCK-"), "Ticket number returned");

  // Execute tool: search_knowledge_base
  const kbExecRes = await toolSearchKb.execute({ query: "pricing" }, executionContext);
  assert.strictEqual(kbExecRes.success, true, "Tool search_knowledge_base should execute successfully");
  assert.ok(Array.isArray(kbExecRes.output.articles), "KB output articles must be an array");

  // Execute tool: submit_user_feedback
  const fbExecRes = await toolFeedback.execute(
    {
      rating: 5,
      feedbackText: "Excellent autonomous multi-step execution!",
      category: "ai_quality",
    },
    executionContext
  );
  assert.strictEqual(fbExecRes.success, true, "Tool submit_user_feedback should execute successfully");
  assert.strictEqual(fbExecRes.output.rating, 5);
  assert.strictEqual(fbExecRes.output.sentiment, "positive");

  console.log("  ✓ All 3 Phase 46 tools successfully executed via Centralized Tool Registry!");
  console.log("\n=== ALL PHASE 46 TESTS PASSED SUCCESSFULLY! ===");
}

runPhase46Tests().catch((err) => {
  console.error("Phase 46 Test Error:", err);
  process.exit(1);
});
