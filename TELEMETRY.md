# TrustPointFin Autonomous Telemetry Directive

## 🎯 Standing Protocol (Zero-Reminder Rule)
As per explicit user directive, **PostHog** and **Sentry** must be utilized autonomously on every development, deployment, feature update, and testing phase without requiring reminders from the user.

### 1. Mandatory Inclusion in all Web Assets
Whenever modifying existing templates, adding new pages, or generating articles:
- Ensure **PostHog snippet** (`phc_sUFPWfBXSBYgsdf22chSzz9n6jxSWENXrCeh4z95Stv7`) is loaded in `<head>`.
- Ensure **Sentry bundle** (`bundle.tracing.replay.min.js`) and [`sentry-init.js`](file:///C:/Users/HP/.gemini/antigravity/scratch/trustpointfin/sentry-init.js) are loaded.
- Ensure the `beforeSend` bridge links `posthog.get_session_replay_url()` and `posthog.get_distinct_id()` into Sentry tags and context.

### 2. Autonomous Action on Errors
- Proactively run telemetry health checks using [`scripts/telemetry.js`](file:///C:/Users/HP/.gemini/antigravity/scratch/trustpointfin/scripts/telemetry.js) during tests and builds.
- When any runtime or network exception occurs, diagnose the exact root cause, inspect the source file and line number, and apply fixes proactively.
- Monitor critical conversion funnels (especially Angel One Demat account referrals `https://a.aonelink.in/ANGOne/8Xovqg1`).
