import { describe, it, expect } from "vitest";
import { isLocationQuery, buildLocationDirective, UserLocationData } from "../app/lib/location/location-service";
import { ToolRegistry } from "../app/lib/ai-orchestrator/tools/tool-registry";
import { pluginTools } from "../app/lib/ai-orchestrator/tools/plugin-tools";
import { classifyIntent } from "../app/lib/ai-orchestrator/intent-classifier";

describe("TATTVA AI — Camera, Location, Plugin & Image Understanding Suite", () => {
  describe("Phase 4: Location Service Intelligence", () => {
    it("should accurately detect direct and natural-language location queries", () => {
      const positiveQueries = [
        "where am I?",
        "what is my current location?",
        "locate me please",
        "find my location",
        "tell me my coordinates",
        "what city am I in right now?",
        "where is my device?",
        "locate my device",
        "what's my gps location?",
        "my current coordinates",
        "where am I right now",
      ];

      for (const query of positiveQueries) {
        expect(isLocationQuery(query), `Expected true for "${query}"`).toBe(true);
      }
    });

    it("should not falsely trigger location detection for unrelated queries", () => {
      const negativeQueries = [
        "how does GPS work?",
        "what is the capital of France?",
        "explain quantum computing",
        "write a python script for sorting",
        "tell me a story about a traveler who lost their map",
      ];

      for (const query of negativeQueries) {
        expect(isLocationQuery(query), `Expected false for "${query}"`).toBe(false);
      }
    });

    it("should construct an accurate and rich location directive with GPS coordinates and maps link", () => {
      const locationData: UserLocationData = {
        latitude: 12.9716,
        longitude: 77.5946,
        city: "Bengaluru",
        district: "Bengaluru Urban",
        state: "Karnataka",
        country: "India",
        displayName: "MG Road, Bengaluru, Karnataka, India",
        timestamp: Date.now(),
      };

      const directive = buildLocationDirective(locationData);

      expect(directive).toContain("12.97160°");
      expect(directive).toContain("77.59460°");
      expect(directive).toContain("Bengaluru");
      expect(directive).toContain("Karnataka");
      expect(directive).toContain("India");
      expect(directive).toContain("MG Road, Bengaluru, Karnataka, India");
      expect(directive).toContain("https://www.google.com/maps/search/?api=1&query=12.9716,77.5946");
    });
  });

  describe("Phase 5: Plugin Architecture Integration", () => {
    it("should have all official plugin tools defined with complete schemas", () => {
      expect(pluginTools.length).toBeGreaterThanOrEqual(6);
      
      const toolNames = pluginTools.map((t) => t.name);
      expect(toolNames).toContain("github_get_repo");
      expect(toolNames).toContain("github_list_issues");
      expect(toolNames).toContain("slack_post_message");
      expect(toolNames).toContain("gdrive_list_files");
      expect(toolNames).toContain("notion_query_db");
      expect(toolNames).toContain("discord_send_alert");

      for (const tool of pluginTools) {
        expect(tool.category).toBe("integration");
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(10);
        expect(typeof tool.execute).toBe("function");
      }
    });

    it("should register all plugin tools in ToolRegistry", () => {
      const registry = new ToolRegistry();
      
      for (const tool of pluginTools) {
        const retrieved = registry.getTool(tool.name);
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe(tool.name);
      }
    });
  });

  describe("Phase 3: Multimodal Image Understanding & Intent Routing", () => {
    it("should route image analysis queries with attachments to document_analysis with image_understanding tool", async () => {
      const dummyImage = {
        name: "test-doc.png",
        type: "image/png",
        data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      };

      const result = await classifyIntent("What is written in this document?", [dummyImage]);
      expect(result.primaryIntent).toBe("document_analysis");
      expect(result.suggestedTools).toContain("image_understanding");
    });

    it("should route camera captures of objects to document_analysis rather than generation", async () => {
      const dummyCameraCapture = {
        name: "camera-capture.jpg",
        type: "image/jpeg",
        data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/",
      };

      const result = await classifyIntent("Can you identify what plant this is?", [dummyCameraCapture]);
      expect(result.primaryIntent).toBe("document_analysis");
      expect(result.suggestedTools).toContain("image_understanding");
    });
  });
});
