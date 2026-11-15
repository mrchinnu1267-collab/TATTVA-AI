/**
 * TATTVA AI - Collaboration & Webhook Notification Integration (Phase 26)
 * Real webhook dispatcher for Slack, Discord, and Microsoft Teams with authentication & formatting
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { WebhookAlertPayload } from "./types";

export class WebhookIntegration {
  private static instance: WebhookIntegration;

  public static getInstance(): WebhookIntegration {
    if (!WebhookIntegration.instance) {
      WebhookIntegration.instance = new WebhookIntegration();
    }
    return WebhookIntegration.instance;
  }

  /**
   * Validates target webhook URL protocol and destination host
   */
  public validateWebhookUrl(url: string, channel: WebhookAlertPayload["channel"]): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;

      if (channel === "slack" && !parsed.hostname.includes("slack.com")) return false;
      if (channel === "discord" && !parsed.hostname.includes("discord.com") && !parsed.hostname.includes("discordapp.com")) return false;
      if (channel === "teams" && !parsed.hostname.includes("office.com") && !parsed.hostname.includes("webhook.office.com")) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Adapts standard alert payload to destination platform schema
   */
  public formatPayload(payload: WebhookAlertPayload): Record<string, any> {
    const colorMap = {
      info: "#3B82F6",
      success: "#10B981",
      warning: "#F59E0B",
      critical: "#EF4444",
    };

    if (payload.channel === "slack") {
      return {
        text: `*${payload.title}*\n${payload.message}`,
        attachments: [
          {
            color: colorMap[payload.severity],
            title: payload.title,
            text: payload.message,
            fields: Object.entries(payload.metadata || {}).map(([k, v]) => ({
              title: k,
              value: String(v),
              short: true,
            })),
            footer: "TATTVA AI Autonomous Monitoring",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };
    }

    if (payload.channel === "discord") {
      return {
        content: `**${payload.title}**`,
        embeds: [
          {
            title: payload.title,
            description: payload.message,
            color: parseInt(colorMap[payload.severity].replace("#", ""), 16),
            fields: Object.entries(payload.metadata || {}).map(([k, v]) => ({
              name: k,
              value: String(v),
              inline: true,
            })),
            footer: { text: "TATTVA AI Alert Mesh" },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    // Microsoft Teams (MessageCard format)
    return {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: colorMap[payload.severity].replace("#", ""),
      summary: payload.title,
      sections: [
        {
          activityTitle: payload.title,
          activitySubtitle: "TATTVA AI Alert Mesh",
          text: payload.message,
          facts: Object.entries(payload.metadata || {}).map(([k, v]) => ({
            name: k,
            value: String(v),
          })),
        },
      ],
    };
  }

  /**
   * Dispatches formatted alert with error containment and timeout bounds
   */
  public async dispatchWebhook(
    webhookUrl: string,
    payload: WebhookAlertPayload,
    mockSender?: (formatted: Record<string, any>) => Promise<{ status: number }>
  ): Promise<{ success: boolean; statusCode: number; error?: string }> {
    if (!this.validateWebhookUrl(webhookUrl, payload.channel)) {
      return {
        success: false,
        statusCode: 400,
        error: `Invalid ${payload.channel} webhook URL. Must be an authentic HTTPS endpoint.`,
      };
    }

    const formatted = this.formatPayload(payload);

    if (mockSender) {
      const res = await mockSender(formatted);
      return { success: res.status >= 200 && res.status < 300, statusCode: res.status };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      return {
        success: res.ok,
        statusCode: res.status,
        error: res.ok ? undefined : `Webhook responded with status ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        error: err.message || "Network timeout or connection error",
      };
    }
  }
}

export const webhookIntegration = WebhookIntegration.getInstance();
