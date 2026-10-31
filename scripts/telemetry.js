const fs = require('fs');
const path = require('path');

const SENTRY_DSN = "https://660d907af68373a90a0f9ba10a40f8ec@o4512316175679488.ingest.us.sentry.io/4512316205039616";
const POSTHOG_KEY = "phc_sUFPWfBXSBYgsdf22chSzz9n6jxSWENXrCeh4z95Stv7";
const POSTHOG_HOST = "https://us.i.posthog.com";

async function pingSentry() {
  try {
    const url = new URL(SENTRY_DSN);
    const key = url.username;
    const res = await fetch(`https://${url.host}/api/${url.pathname.replace('/', '')}/envelope/`, {
      method: 'POST',
      headers: {
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=telemetry/1.0, sentry_key=${key}`
      },
      body: JSON.stringify({ event_id: '0123456789abcdef0123456789abcdef' })
    });
    return res.status === 200 || res.status === 400 ? 'ONLINE (Ingest Active)' : `HTTP ${res.status}`;
  } catch (e) {
    return `OFFLINE (${e.message})`;
  }
}

async function pingPostHog() {
  try {
    const res = await fetch(`${POSTHOG_HOST}/decide/?v=3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: 'telemetry_checker'
      })
    });
    const data = await res.json();
    return res.status === 200 && data ? 'ONLINE (Feature Flags & Analytics Active)' : `HTTP ${res.status}`;
  } catch (e) {
    return `OFFLINE (${e.message})`;
  }
}

async function run() {
  console.log("==================================================");
  console.log("   🛡️ TRUSTPOINTFIN UNIFIED TELEMETRY PULSE");
  console.log("==================================================");
  
  const sentryStatus = await pingSentry();
  const posthogStatus = await pingPostHog();
  
  console.log(`📡 Sentry Ingestion Status:   ${sentryStatus}`);
  console.log(`📊 PostHog Telemetry Status:  ${posthogStatus}`);
  console.log("--------------------------------------------------");
  console.log("🎯 Active Endpoints:");
  console.log(`   • Sentry Project ID:   4512316205039616`);
  console.log(`   • Sentry Org:          o4512316175679488`);
  console.log(`   • PostHog Host:        ${POSTHOG_HOST}`);
  console.log(`   • PostHog Project Key: ${POSTHOG_KEY.substring(0, 12)}...`);
  console.log("==================================================");
}

run();
