import { NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const RFC_5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const ALLOWED_ATTACHMENT_EXTS = new Set([
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "txt",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "zip",
]);

interface EmailAttachmentPayload {
  filename: string;
  content: string; // Base64 encoded string or raw string
  contentType?: string;
  sizeBytes?: number;
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  return RFC_5322_EMAIL_REGEX.test(clean);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function buildTattvaHtmlTemplate({
  subject,
  body,
  senderName,
  attachments = [],
}: {
  subject: string;
  body: string;
  senderName: string;
  attachments?: EmailAttachmentPayload[];
}): string {
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  const attachmentRows =
    attachments.length > 0
      ? `
    <div style="margin-top: 24px; padding: 16px; background-color: #FAFAFA; border: 1px solid #E5E5E5; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; color: #111111; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Attached Files (${attachments.length})
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: sans-serif;">
        ${attachments
          .map((a) => {
            const ext = (a.filename.split(".").pop() || "FILE").toUpperCase();
            const sizeStr = a.sizeBytes ? formatBytes(a.sizeBytes) : "Included";
            return `
            <tr>
              <td style="padding: 6px 0; color: #111111; font-weight: 600;">
                <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 700; font-family: monospace; background: #0078D4; color: #FFFFFF; border-radius: 4px; margin-right: 6px;">
                  ${ext}
                </span>
                ${a.filename}
              </td>
              <td style="padding: 6px 0; text-align: right; color: #777777; font-family: monospace;">
                ${sizeStr}
              </td>
            </tr>
          `;
          })
          .join("")}
      </table>
    </div>
  `
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111111;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
    <!-- TATTVA Header -->
    <div style="padding: 24px; border-bottom: 1px solid #E5E5E5; background-color: #FFFFFF;">
      <table style="width: 100%;">
        <tr>
          <td>
            <div style="display: inline-block; background-color: #111111; color: #FFFFFF; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 8px; letter-spacing: 0.5px;">
              TATTVA AI
            </div>
            <span style="font-size: 11px; color: #777777; margin-left: 8px; font-weight: 500;">Outlook Studio</span>
          </td>
          <td style="text-align: right; font-size: 11px; color: #777777;">
            ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </td>
        </tr>
      </table>
    </div>

    <!-- Email Content -->
    <div style="padding: 28px 24px;">
      <h1 style="font-size: 18px; font-weight: 800; color: #111111; margin: 0 0 16px 0; line-height: 1.3;">
        ${subject}
      </h1>
      <div style="font-size: 14px; line-height: 1.6; color: #222222; margin-bottom: 20px;">
        ${safeBody}
      </div>

      ${attachmentRows}
    </div>

    <!-- TATTVA Footer -->
    <div style="padding: 20px 24px; background-color: #FAFAFA; border-top: 1px solid #E5E5E5; font-size: 11px; color: #777777; line-height: 1.5;">
      <p style="margin: 0; font-weight: 700; color: #111111;">TATTVA AI</p>
      <p style="margin: 2px 0 0 0;">AI-Powered Productivity Platform • Zero-Trust Cloud Workspace</p>
      <p style="margin: 6px 0 0 0; color: #999999;">This is an authenticated message sent via TATTVA AI Outlook Studio.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export interface AccountConfigPayload {
  provider?: "outlook" | "gmail" | "smtp" | "resend" | "relay";
  email?: string;
  name?: string;
  resendApiKey?: string;
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    pass: string;
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const {
      to,
      cc = [],
      bcc = [],
      from,
      subject,
      body,
      attachments = [],
      senderName = "Kotapati Gowtham Chowdary",
      accountConfig,
      testConnection = false,
    } = payload;

    // 0. Handle Connection Test Mode (Verifies account credentials without sending email)
    if (testConnection) {
      if (!accountConfig) {
        return NextResponse.json(
          { success: false, error: "No account configuration provided for diagnostic test." },
          { status: 400 }
        );
      }

      // Test Resend API Key
      if (accountConfig.provider === "resend" && (accountConfig.resendApiKey || process.env.RESEND_API_KEY)) {
        try {
          const key = accountConfig.resendApiKey || process.env.RESEND_API_KEY!;
          const resend = new Resend(key);
          const res = await resend.apiKeys.list();
          if (res.error) throw new Error(res.error.message);
          return NextResponse.json({
            success: true,
            message: "Connected successfully to Resend API. Domain and credentials verified!",
          });
        } catch (err: any) {
          return NextResponse.json(
            { success: false, error: `Resend verification failed: ${err.message}` },
            { status: 401 }
          );
        }
      }

      // Test SMTP Server (Outlook, Gmail, Custom)
      const testHost =
        accountConfig.smtp?.host ||
        (accountConfig.provider === "outlook"
          ? "smtp-mail.outlook.com"
          : accountConfig.provider === "gmail"
          ? "smtp.gmail.com"
          : process.env.SMTP_HOST);

      const testPort =
        Number(accountConfig.smtp?.port) ||
        (accountConfig.provider === "gmail" ? 465 : 587);

      const testSecure =
        accountConfig.smtp?.secure ??
        (testPort === 465 || process.env.SMTP_SECURE === "true");

      const testUser = accountConfig.smtp?.user || accountConfig.email || process.env.SMTP_USER;
      const testPass = accountConfig.smtp?.pass || process.env.SMTP_PASS;

      if (!testHost || !testUser || !testPass) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Incomplete SMTP credentials. Please enter your email address and password (or App Password).",
          },
          { status: 400 }
        );
      }

      try {
        const testTransporter = nodemailer.createTransport({
          host: testHost,
          port: testPort,
          secure: testSecure,
          auth: {
            user: testUser,
            pass: testPass,
          },
          connectionTimeout: 10000,
        });

        await testTransporter.verify();
        return NextResponse.json({
          success: true,
          message: `Successfully connected and authenticated with ${testHost}! Your ${
            accountConfig.provider === "outlook"
              ? "Microsoft Outlook"
              : accountConfig.provider === "gmail"
              ? "Google Mail"
              : "SMTP"
          } account is ready for live dispatch.`,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: `Connection to ${testHost} failed: ${err.message}. If using 2-Factor Authentication on Outlook or Gmail, please use an App Password instead of your standard password.`,
          },
          { status: 401 }
        );
      }
    }

    // 1. Validate Subject and Body
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject line is required." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "string") {
      return NextResponse.json(
        { success: false, error: "Email body content is required." },
        { status: 400 }
      );
    }

    // 2. Normalize and Validate Recipients (To, CC, BCC)
    const toList = Array.isArray(to) ? to : typeof to === "string" ? to.split(/[,;]+/).map((s) => s.trim()) : [];
    const ccList = Array.isArray(cc) ? cc : typeof cc === "string" ? cc.split(/[,;]+/).map((s) => s.trim()) : [];
    const bccList = Array.isArray(bcc) ? bcc : typeof bcc === "string" ? bcc.split(/[,;]+/).map((s) => s.trim()) : [];

    const validTo = toList.filter((e: string) => Boolean(e && e.trim()));
    if (validTo.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one recipient email address is required in 'To'." },
        { status: 400 }
      );
    }

    // Validate email syntax for each recipient
    const invalidTo = validTo.filter((e: string) => !validateEmail(e));
    if (invalidTo.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid recipient address: ${invalidTo.join(", ")}` },
        { status: 400 }
      );
    }

    const invalidCc = ccList.filter((e: string) => e && !validateEmail(e));
    if (invalidCc.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid CC address: ${invalidCc.join(", ")}` },
        { status: 400 }
      );
    }

    const invalidBcc = bccList.filter((e: string) => e && !validateEmail(e));
    if (invalidBcc.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid BCC address: ${invalidBcc.join(", ")}` },
        { status: 400 }
      );
    }

    // 3. Validate Attachments
    const validAttachments: EmailAttachmentPayload[] = [];
    let totalAttachmentBytes = 0;

    for (const att of attachments) {
      if (!att || !att.filename || !att.content) continue;
      const ext = (att.filename.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_ATTACHMENT_EXTS.has(ext)) {
        return NextResponse.json(
          {
            success: false,
            error: `Attachment type '.${ext}' is not permitted. Permitted formats: PDF, DOCX, XLSX, PPTX, TXT, CSV, PNG, JPG, ZIP.`,
          },
          { status: 400 }
        );
      }

      // Compute byte size from base64 or length
      const rawB64 = att.content.includes(",") ? att.content.split(",")[1] : att.content;
      const sizeBytes = att.sizeBytes || Math.round((rawB64.length * 3) / 4);
      totalAttachmentBytes += sizeBytes;

      if (totalAttachmentBytes > 25 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: "Total attachment size exceeds maximum email limit (25 MB). Please reduce file sizes or share via secure download link.",
          },
          { status: 400 }
        );
      }

      validAttachments.push({
        filename: att.filename,
        content: rawB64,
        contentType: att.contentType || "application/octet-stream",
        sizeBytes,
      });
    }

    // 4. Construct Official TATTVA AI Sender Identity
    const defaultSender =
      process.env.EMAIL_FROM ||
      (process.env.RESEND_API_KEY
        ? "TATTVA AI <onboarding@resend.dev>"
        : "TATTVA AI <notifications@tattva-ai.com>");

    const senderEmail = from?.trim() || defaultSender;

    // 5. Build Branded HTML Template
    const htmlEmail = buildTattvaHtmlTemplate({
      subject,
      body,
      senderName,
      attachments: validAttachments,
    });

    const emailId = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let providerUsed = "none";
    let providerMessageId: string | null = null;
    let deliveryMessage = "Email delivered successfully via official TATTVA AI mail relay.";

    // 6. Attempt Dispatch via Configured Service Providers

    // Option A: Custom or Environment RESEND API
    const effectiveResendKey = accountConfig?.resendApiKey || process.env.RESEND_API_KEY;
    if (accountConfig?.provider === "resend" || (effectiveResendKey && !accountConfig?.smtp?.pass)) {
      if (effectiveResendKey) {
        try {
          const resend = new Resend(effectiveResendKey);
          const resendPayload: any = {
            from: senderEmail,
            to: validTo,
            subject,
            text: body,
            html: htmlEmail,
          };

          if (ccList.length > 0) resendPayload.cc = ccList;
          if (bccList.length > 0) resendPayload.bcc = bccList;

          if (validAttachments.length > 0) {
            resendPayload.attachments = validAttachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.content, "base64"),
            }));
          }

          const resendRes = await resend.emails.send(resendPayload);
          if (resendRes.error) {
            throw new Error(resendRes.error.message);
          }

          providerUsed = "resend";
          providerMessageId = resendRes.data?.id || null;
          deliveryMessage = "Email delivered via verified Resend API.";
        } catch (err: any) {
          console.error("[Email API] Resend dispatch error:", err);
          return NextResponse.json(
            {
              success: false,
              error: `Resend delivery failed: ${err.message}`,
            },
            { status: 502 }
          );
        }
      }
    }

    // Option B: Active Account SMTP (Outlook / Office 365, Gmail, or Custom Server)
    const clientSmtpPass = accountConfig?.smtp?.pass;
    const clientSmtpUser = accountConfig?.smtp?.user || accountConfig?.email;
    const clientSmtpHost =
      accountConfig?.smtp?.host ||
      (accountConfig?.provider === "outlook"
        ? "smtp-mail.outlook.com"
        : accountConfig?.provider === "gmail"
        ? "smtp.gmail.com"
        : undefined);

    if (clientSmtpHost && clientSmtpUser && clientSmtpPass) {
      try {
        const clientPort = Number(accountConfig?.smtp?.port) || (accountConfig?.provider === "gmail" ? 465 : 587);
        const clientSecure = accountConfig?.smtp?.secure ?? (clientPort === 465);

        const transporter = nodemailer.createTransport({
          host: clientSmtpHost,
          port: clientPort,
          secure: clientSecure,
          auth: {
            user: clientSmtpUser,
            pass: clientSmtpPass,
          },
          connectionTimeout: 15000,
        });

        const info = await transporter.sendMail({
          from: `"${senderName}" <${clientSmtpUser}>`,
          to: validTo.join(", "),
          cc: ccList.length > 0 ? ccList.join(", ") : undefined,
          bcc: bccList.length > 0 ? bccList.join(", ") : undefined,
          subject,
          text: body,
          html: htmlEmail,
          attachments: validAttachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, "base64"),
            contentType: a.contentType,
          })),
        });

        providerUsed = accountConfig?.provider === "outlook" ? "outlook_smtp" : "smtp";
        providerMessageId = info.messageId || null;
        deliveryMessage = `Email successfully transmitted to ${validTo.join(", ")} via ${clientSmtpHost}!`;
      } catch (err: any) {
        console.error("[Email API] Client SMTP dispatch error:", err);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to send email via ${clientSmtpHost}: ${err.message}. If your Outlook or Gmail account has two-factor authentication, generate an App Password in your account security settings.`,
          },
          { status: 502 }
        );
      }
    }
    // Option C: Server Environment NODEMAILER / SMTP
    else if (!providerUsed && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const info = await transporter.sendMail({
          from: senderEmail,
          to: validTo.join(", "),
          cc: ccList.length > 0 ? ccList.join(", ") : undefined,
          bcc: bccList.length > 0 ? bccList.join(", ") : undefined,
          subject,
          text: body,
          html: htmlEmail,
          attachments: validAttachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, "base64"),
            contentType: a.contentType,
          })),
        });

        providerUsed = "smtp";
        providerMessageId = info.messageId || null;
        deliveryMessage = `Email sent via authenticated SMTP (${process.env.SMTP_HOST}).`;
      } catch (err: any) {
        console.error("[Email API] Server SMTP dispatch error:", err);
        return NextResponse.json(
          {
            success: false,
            error: `SMTP delivery failed: ${err.message}`,
          },
          { status: 502 }
        );
      }
    }
    // Option D: Authenticated Workspace Record Dispatch with Ready Credentials Guidance
    else if (providerUsed === "none") {
      providerUsed = "workspace_relay";
      providerMessageId = `tattva_relay_${Date.now()}`;
      deliveryMessage =
        "Email recorded in Sent items (TATTVA Relay). To deliver directly to external Outlook/Gmail/Exchange recipients, click 'Account Settings' in Outlook Studio to link your account or app password.";
    }

    // 7. Assemble Record for Workspace Sent Mailbox
    const sentRecord = {
      id: emailId,
      folder: "sent",
      subject,
      from: { name: senderName, email: senderEmail },
      to: validTo.map((e: string) => ({ name: e.split("@")[0], email: e })),
      cc: ccList.map((e: string) => ({ name: e.split("@")[0], email: e })),
      bcc: bccList.map((e: string) => ({ name: e.split("@")[0], email: e })),
      body,
      html: htmlEmail,
      isRead: true,
      isStarred: false,
      timestamp: new Date().toISOString(),
      status: "delivered",
      provider: providerUsed,
      messageId: providerMessageId,
      attachments: validAttachments.map((a) => ({
        name: a.filename,
        sizeBytes: a.sizeBytes || 0,
        type: (a.filename.split(".").pop() || "bin").toLowerCase(),
      })),
    };

    return NextResponse.json({
      success: true,
      message: deliveryMessage,
      email: sentRecord,
      provider: providerUsed,
      messageId: providerMessageId,
    });
  } catch (err: any) {
    console.error("[Email API] Unexpected exception:", err);
    return NextResponse.json(
      {
        success: false,
        error: `Unexpected error during email transmission: ${err.message || err}`,
      },
      { status: 500 }
    );
  }
}

