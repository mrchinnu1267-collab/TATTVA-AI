import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",

  // Performance Monitoring: Sample 10% in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay: Capture 100% of sessions with errors, 5% of healthy sessions
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Security guardrail: strip sensitive data before dispatch
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-supabase-auth"];
    }

    const sensitivePatterns = [
      /pass/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /credential/i,
      /prompt/i,
      /message/i,
      /content/i,
      /email/i,
    ];

    if (event.extra) {
      for (const k of Object.keys(event.extra)) {
        if (sensitivePatterns.some((pattern) => pattern.test(k))) {
          event.extra[k] = "[REDACTED]";
        }
      }
    }

    return event;
  },
});

