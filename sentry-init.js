/**
 * TrustPointFin - Unified PostHog Analytics & Sentry Monitoring Integration
 * 
 * Features:
 * 1. PostHog Product & Web Analytics with Session Replays
 * 2. Sentry Error Tracking & Real-Time Performance Monitoring
 * 3. Bidirectional Bridge: Automatically attaches active PostHog Session Replay URLs 
 *    and Distinct IDs to every Sentry issue.
 */

(function () {
  const POSTHOG_API_KEY = "phc_sUFPWfBXSBYgsdf22chSzz9n6jxSWENXrCeh4z95Stv7";
  const POSTHOG_HOST = "https://us.i.posthog.com";
  const SENTRY_DSN = "https://660d907af68373a90a0f9ba10a40f8ec@o4512316175679488.ingest.us.sentry.io/4512316205039616";

  // ── 1. Initialize PostHog ──
  if (window.posthog && typeof window.posthog.init === "function") {
    try {
      window.posthog.init(POSTHOG_API_KEY, {
        api_host: POSTHOG_HOST,
        defaults: '2026-05-30',
        person_profiles: 'always',
        session_recording: {
          recordCrossOriginIframes: true,
          maskAllInputs: false
        },
        enable_recording_console_log: true,
        loaded: function (ph) {
          console.log("✅ [PostHog] Loaded & connected with Distinct ID:", ph.get_distinct_id());
        }
      });
    } catch (e) {
      console.warn("⚠️ [PostHog] Init notice:", e);
    }
  }

  // ── 2. Initialize Sentry with PostHog Bridge ──
  function setupSentry() {
    if (!window.Sentry || typeof window.Sentry.init !== "function") return;

    window.Sentry.init({
      dsn: SENTRY_DSN,
      environment: window.location.hostname.includes("trustpointfin.org") ? "production" : "development",
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        window.Sentry.browserTracingIntegration ? window.Sentry.browserTracingIntegration() : null,
        window.Sentry.replayIntegration ? window.Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false
        }) : null
      ].filter(Boolean),
      beforeSend: function (event) {
        try {
          if (window.posthog) {
            // Attach exact timestamped PostHog replay URL to Sentry
            if (typeof window.posthog.get_session_replay_url === "function") {
              const replayUrl = window.posthog.get_session_replay_url({ withTimestamp: true });
              if (replayUrl) {
                event.tags = event.tags || {};
                event.tags.posthog_replay_url = replayUrl;
                event.extra = event.extra || {};
                event.extra.posthog_session_replay = replayUrl;
              }
            }
            // Attach PostHog user identity
            if (typeof window.posthog.get_distinct_id === "function") {
              const distinctId = window.posthog.get_distinct_id();
              if (distinctId) {
                event.tags = event.tags || {};
                event.tags.posthog_distinct_id = distinctId;
                if (!event.user) event.user = {};
                event.user.id = event.user.id || distinctId;
              }
            }
          }
        } catch (err) {
          // Keep Sentry resilient
        }
        return event;
      }
    });

    console.log("✅ [Sentry] Initialized & bridged with PostHog");
  }

  if (window.Sentry && typeof window.Sentry.init === "function") {
    setupSentry();
  } else if (window.Sentry && typeof window.Sentry.onLoad === "function") {
    window.Sentry.onLoad(setupSentry);
  } else {
    window.addEventListener("DOMContentLoaded", setupSentry);
  }
})();
