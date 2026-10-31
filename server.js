// ── server.js ─────────────────────────────────────────────────────────────────
// TrustPoint Finance Backend API & Academy Authorization Server (V3.0 Staging)
// Pure Native Node Engine: node:http + node:sqlite + node:crypto • Zero External Dependencies
// Server-Authoritative Candidate Authentication, Quiz Grading, Progression & Route Protection

const http   = require('node:http');
const https  = require('node:https');
const fs     = require('node:fs');
const path   = require('node:path');
const url    = require('node:url');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'trustpoint.db');

// Ensure parent directory for database exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ── Sentry Error Monitoring Integration ──
const SENTRY_DSN = process.env.SENTRY_DSN || "https://660d907af68373a90a0f9ba10a40f8ec@o4512316175679488.ingest.us.sentry.io/4512316205039616";
function captureSentryException(err, context = {}) {
  try {
    const parsed = new URL(SENTRY_DSN);
    const pubKey = parsed.username;
    const projId = parsed.pathname.replace(/^\//, '');
    const event = {
      event_id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date().toISOString(),
      platform: 'node',
      level: 'error',
      logger: 'trustpoint-server',
      exception: {
        values: [{
          type: err.name || 'Error',
          value: err.message || String(err),
          stacktrace: { frames: [] }
        }]
      },
      extra: context,
      environment: process.env.NODE_ENV || 'production'
    };
    const body = JSON.stringify(event);
    const sreq = https.request({
      hostname: parsed.host,
      path: `/api/${projId}/store/`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=trustpoint-node/1.0, sentry_key=${pubKey}`
      }
    });
    sreq.on('error', () => {});
    sreq.write(body);
    sreq.end();
  } catch (e) {}
}
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  captureSentryException(err, { type: 'uncaughtException' });
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  captureSentryException(reason instanceof Error ? reason : new Error(String(reason)), { type: 'unhandledRejection' });
});

// ── Database Initialization ──
const db = new DatabaseSync(DB_PATH);

// 1. CRM Leads Table (Preserving Existing Architecture)
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    angel_code TEXT,
    bse_ucc TEXT,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 2. Candidate Identity, OTP & Session Tables (Server-Authoritative Authentication)
db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS candidate_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile TEXT NOT NULL,
    otp TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at DATETIME NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS candidate_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    course_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completion_percentage INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    quiz_attempts INTEGER DEFAULT 0,
    best_quiz_score INTEGER DEFAULT 0,
    completed_at DATETIME,
    UNIQUE(candidate_id, course_id, module_id, lesson_id)
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    lesson_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    submitted_answers TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS advisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS advisor_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advisor_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (advisor_id) REFERENCES advisors(id)
  );

  CREATE TABLE IF NOT EXISTS advisor_login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const {
  initJournalDatabase,
  seedDefaultTrades,
  computeTradeMetrics,
  calculateIndianStatutoryTaxes,
  computeJournalAnalytics,
  generateAiCoachingReport,
  pairRawExecutionsFIFO,
  fetchLiveBrokerTrades
} = require('./services/journalEngine');

initJournalDatabase(db);

// Password hashing utilities using Node.js built-in crypto (scrypt)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Rate limiting & Client IP detection for Advisor Login
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket ? req.socket.remoteAddress : '127.0.0.1';
}

function checkAdvisorRateLimit(ip, username) {
  const identifier = `${ip}:${(username || '').toLowerCase()}`;
  // Count failed attempts within last 15 minutes
  const row = db.prepare(`
    SELECT COUNT(*) AS failed_count, MAX(created_at) as last_attempt
    FROM advisor_login_attempts
    WHERE identifier = ? AND success = 0 AND datetime(created_at, '+15 minutes') > datetime('now')
  `).get(identifier);

  if (row && row.failed_count >= 5) {
    return { locked: true, attempts: row.failed_count };
  }
  return { locked: false, attempts: row ? row.failed_count : 0 };
}

function recordAdvisorLoginAttempt(ip, username, success) {
  const identifier = `${ip}:${(username || '').toLowerCase()}`;
  if (success) {
    // Clear failed attempts on successful login
    db.prepare('DELETE FROM advisor_login_attempts WHERE identifier = ?').run(identifier);
  } else {
    // Record failed attempt
    db.prepare('INSERT INTO advisor_login_attempts (identifier, success) VALUES (?, 0)').run(identifier);
  }
}

// ── Advisor Account Provisioning (Strict Staging vs Production Separation) ──
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const prodAdvisorUser = process.env.PROD_ADVISOR_USERNAME;
  const prodAdvisorPass = process.env.PROD_ADVISOR_PASSWORD;
  if (prodAdvisorUser && prodAdvisorPass) {
    const existingAdvisor = db.prepare('SELECT id FROM advisors WHERE username = ?').get(prodAdvisorUser);
    if (!existingAdvisor) {
      const hash = hashPassword(prodAdvisorPass);
      db.prepare(`
        INSERT INTO advisors (username, password_hash, status)
        VALUES (?, ?, 'active')
      `).run(prodAdvisorUser, hash);
      console.log(`[ADVISOR] Provisioned production advisor account: '${prodAdvisorUser}'`);
    }
  } else {
    console.log('[ADVISOR] Production mode active: Zero default advisor credentials seeded. Awaiting PROD_ADVISOR_USERNAME and PROD_ADVISOR_PASSWORD.');
  }
} else {
  // Staging / Development mode
  const defaultAdvisorUser = process.env.STAGING_ADVISOR_USERNAME || 'advisor_staging';
  const defaultAdvisorPass = process.env.STAGING_ADVISOR_PASSWORD || 'StagingAdvisor2026!Sec';
  const existingAdvisor = db.prepare('SELECT id FROM advisors WHERE username = ?').get(defaultAdvisorUser);
  if (!existingAdvisor) {
    const hash = hashPassword(defaultAdvisorPass);
    db.prepare(`
      INSERT INTO advisors (username, password_hash, status)
      VALUES (?, ?, 'active')
    `).run(defaultAdvisorUser, hash);
    console.log(`[ADVISOR] Initialized secure staging advisor account: '${defaultAdvisorUser}'`);
  }
}

// ── CRM Leads Table Pre-population (Staging-Only Safeguard) ──
const leadCountRow = db.prepare('SELECT COUNT(*) AS count FROM leads').get();
if (leadCountRow && leadCountRow.count === 0) {
  if (process.env.NODE_ENV !== 'production') {
    const insertLead = db.prepare(`
      INSERT INTO leads (name, contact, angel_code, bse_ucc, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLead.run('Rohan Sharma', '+91 98765 43210', 'ROHA4322', 'UCC-90812', 'Fully Mapped');
    insertLead.run('Priya Patel', '+91 87654 32109', 'PRIY8901', null, 'Only F&O');
    insertLead.run('Amit Verma', '+91 76543 21098', null, null, 'Locked');
    console.log('[DATABASE] Pre-populated default CRM leads successfully (staging mode).');
  } else {
    console.log('[DATABASE] Production mode active: Zero mock leads seeded. Leads table is clean.');
  }
}

// ── Authoritative Academy Knowledge & Answer Keys (Server-Side ONLY) ──
const AUTHORITATIVE_ACADEMY = {
  courseId: 'SMF_HINDI',
  moduleId: 'M01',
  lessons: {
    'M01_L01': {
      prerequisite: null,
      title: 'Business & Capital (व्यवसाय और पूंजी)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 2, 0, 1, 2] },
      nextLessonId: 'M01_L02'
    },
    'M01_L02': {
      prerequisite: 'M01_L01',
      title: 'Revenue, Costs & Net Profit',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 0, 2] },
      nextLessonId: 'M01_L03'
    },
    'M01_L03': {
      prerequisite: 'M01_L02',
      title: 'Debt vs Equity (व्यापार वित्तपोषण के दो रास्ते)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 2, 1, 2] },
      nextLessonId: 'M01_L04'
    },
    'M01_L04': {
      prerequisite: 'M01_L03',
      title: 'What Is a Share & Equity Ownership (शेयर और मालिकाना हक)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 2, 0, 2, 3] },
      nextLessonId: 'M01_L05'
    },
    'M01_L05': {
      prerequisite: 'M01_L04',
      title: 'Why Stock Prices Move (शेयर की कीमतें क्यों बदलती हैं)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 0, 2, 0, 0] },
      nextLessonId: 'M01_L06'
    },
    'M01_L06': {
      prerequisite: 'M01_L05',
      title: 'What Is the Stock Market (शेयर बाजार क्या है और यह कैसे काम करता है)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L07'
    },
    'M01_L07': {
      prerequisite: 'M01_L06',
      title: 'IPO & Public Listing (आईपीओ और शेयर बाजार में लिस्टिंग)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L08'
    },
    'M01_L08': {
      prerequisite: 'M01_L07',
      title: 'Market Ecosystem: NSE, BSE & SEBI (भारतीय बाजार का ढांचा)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 2, 1, 0, 1] },
      nextLessonId: 'M01_L09'
    },
    'M01_L09': {
      prerequisite: 'M01_L08',
      title: 'Market Indices & Capitalization (मार्केट कैप और सूचकांक)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 0, 1, 1] },
      nextLessonId: 'M01_L10'
    },
    'M01_L10': {
      prerequisite: 'M01_L09',
      title: 'Market Participants (बाजार के खिलाड़ी: रिटेल, DII और FII)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 0, 1, 1, 1] },
      nextLessonId: 'M01_L11'
    },
    'M01_L11': {
      prerequisite: 'M01_L10',
      title: 'The Trinity of Accounts (तीन जरूरी खाते: बैंक, ट्रेडिंग और डीमैट)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 0, 1, 1, 1] },
      nextLessonId: 'M01_L12'
    },
    'M01_L12': {
      prerequisite: 'M01_L11',
      title: 'Trade Lifecycle & Settlement (ट्रेड की यात्रा: ऑर्डर से लेकर T+1 तक)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L13'
    },
    'M01_L13': {
      prerequisite: 'M01_L12',
      title: 'Market Timings, Brokerage & Charges (बाजार का समय और वास्तविक शुल्क)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 0, 1, 1, 1] },
      nextLessonId: 'M01_L14'
    },
    'M01_L14': {
      prerequisite: 'M01_L13',
      title: 'Order Types & Execution (ऑर्डर के प्रकार: मार्केट, लिमिट और स्टॉप लॉस)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L15'
    },
    'M01_L15': {
      prerequisite: 'M01_L14',
      title: 'Delivery vs Intraday, Margin & Leverage (डिलीवरी बनाम इंट्राडे, मार्जिन और लीवरेज)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L16'
    },
    'M01_L16': {
      prerequisite: 'M01_L15',
      title: 'PnL, Risk Management & Position Sizing (जोखिम प्रबंधन और पोजीशन साइजिंग)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 0, 1] },
      nextLessonId: 'M01_L17'
    },
    'M01_L17': {
      prerequisite: 'M01_L16',
      title: 'Stock Charts & Timeframes (चार्ट और समय-सीमा)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L18'
    },
    'M01_L18': {
      prerequisite: 'M01_L17',
      title: 'Japanese Candlesticks (जापानी कैंडलस्टिक: ओएचएलसी और मुख्य पैटर्न)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 0, 1, 1] },
      nextLessonId: 'M01_L19'
    },
    'M01_L19': {
      prerequisite: 'M01_L18',
      title: 'Trend, Support, Resistance & Volume (ट्रेंड, सपोर्ट, रेजिस्टेंस और वॉल्यूम)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: 'M01_L20'
    },
    'M01_L20': {
      prerequisite: 'M01_L19',
      title: 'EMA, RSI, VWAP & Clean Setup Rules (तकनीकी संकेतक और स्वर्णिम नियम)',
      quiz: { totalQuestions: 5, passingThreshold: 70, correctAnswers: [1, 1, 1, 1, 1] },
      nextLessonId: null
    }
  }
};

// ── Authoritative Candidate Progression Helper ──
function getAuthoritativeCandidateState(candidateId) {
  const rows = db.prepare(`
    SELECT lesson_id, completed, best_quiz_score, completion_percentage
    FROM lesson_progress
    WHERE candidate_id = ? AND course_id = ? AND module_id = ?
  `).all(candidateId, AUTHORITATIVE_ACADEMY.courseId, AUTHORITATIVE_ACADEMY.moduleId);

  const completedMap = {};
  rows.forEach(r => {
    if (r.completed === 1) completedMap[r.lesson_id] = true;
  });

  const completedLessons = Object.keys(completedMap);
  const unlockedLessons = ['M01_L01']; // First lesson always unlocked

  for (let i = 2; i <= 20; i++) {
    const prevKey = 'M01_L' + String(i - 1).padStart(2, '0');
    const currKey = 'M01_L' + String(i).padStart(2, '0');
    if (completedMap[prevKey]) {
      unlockedLessons.push(currKey);
    } else {
      break; // Strictly sequential gating
    }
  }

  return {
    candidateId,
    completedLessons,
    unlockedLessons,
    progressRows: rows
  };
}

// ── OTP Provider Abstraction (Fast2SMS Production Adapter) ──
class OtpProvider {
  static async sendOtp(mobile, otp) {
    const isProd = process.env.NODE_ENV === 'production';
    const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

    // 1. Default Mock Mode:
    // If no SMS provider is configured, or explicitly set to mock/console:
    // Retain mock OTP behavior for local testing.
    if (!provider || provider === 'mock' || provider === 'console') {
      console.log(`[OTP DISPATCH] (MOCK Mode) Destination: +91 ${mobile} | Code: ${otp} (Valid 10 min)`);
      return { success: true, mode: 'staging-mock' };
    }

    // 2. Production Fast2SMS Adapter
    if (provider === 'fast2sms') {
      const apiKey = process.env.SMS_API_KEY;
      const senderId = process.env.SMS_SENDER_ID;
      const templateId = process.env.SMS_TEMPLATE_ID;

      if (!apiKey) {
        console.error('[OTP ERROR] Fast2SMS dispatch aborted: Missing required SMS_API_KEY.');
        return { success: false, error: 'SMS gateway authentication missing.' };
      }

      // Security: Mask mobile number for production logs (e.g. +91 98******10)
      const maskedMobile = (typeof mobile === 'string' && mobile.length === 10)
        ? `${mobile.substring(0, 2)}******${mobile.substring(8)}`
        : '**********';

      // Support official DLT route when DLT credentials are provided;
      // Otherwise default to Fast2SMS Quick SMS route ('q') which bypasses DLT and website verification;
      // Or route 'otp' if explicitly configured via SMS_ROUTE.
      const isDlt = Boolean(senderId && templateId);
      const configuredRoute = (process.env.SMS_ROUTE || (isDlt ? 'dlt' : 'q')).toLowerCase();
      const isQuickSms = !isDlt && configuredRoute === 'q';
      const isOtpRoute = !isDlt && configuredRoute === 'otp';

      console.log(`[OTP DISPATCH] Fast2SMS request initiated (${isDlt ? 'DLT Route' : (isQuickSms ? 'Quick SMS Route (q)' : 'OTP Route')}) for destination +91 ${maskedMobile}`);

      let postPayload;
      if (isDlt) {
        postPayload = JSON.stringify({
          route: 'dlt',
          sender_id: senderId,
          message: templateId,
          variables_values: String(otp),
          numbers: String(mobile),
          flash: 0
        });
      } else if (isOtpRoute) {
        postPayload = JSON.stringify({
          route: 'otp',
          variables_values: String(otp),
          numbers: String(mobile)
        });
      } else {
        // Fast2SMS Quick SMS route ('q') — bypasses DLT template and website verification
        postPayload = JSON.stringify({
          route: 'q',
          message: `Your TrustPoint Finance Academy verification code is ${otp}. Valid for 10 minutes.`,
          numbers: String(mobile)
        });
      }

      return new Promise((resolve) => {
        const reqOpts = {
          hostname: 'www.fast2sms.com',
          path: '/dev/bulkV2',
          method: 'POST',
          timeout: 8000,
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postPayload)
          }
        };

        const clientReq = https.request(reqOpts, (clientRes) => {
          let rawData = '';
          clientRes.on('data', (chunk) => { rawData += chunk; });
          clientRes.on('end', () => {
            try {
              const resJson = JSON.parse(rawData);
              if (clientRes.statusCode === 200 && resJson && resJson.return === true) {
                console.log(`[OTP DISPATCH] Fast2SMS dispatch succeeded (Request ID: ${resJson.request_id || 'OK'})`);
                resolve({ success: true, provider: 'fast2sms', requestId: resJson.request_id });
              } else {
                const errMsg = resJson && resJson.message
                  ? (Array.isArray(resJson.message) ? resJson.message.join(', ') : String(resJson.message))
                  : `Gateway returned status ${clientRes.statusCode}`;
                console.error(`[OTP ERROR] Fast2SMS gateway rejection: ${errMsg}`);
                resolve({ success: false, error: errMsg });
              }
            } catch (parseErr) {
              console.error('[OTP ERROR] Fast2SMS response parsing failed (malformed JSON).');
              resolve({ success: false, error: 'Malformed response from SMS provider.' });
            }
          });
        });

        clientReq.on('timeout', () => {
          clientReq.destroy();
          console.error('[OTP ERROR] Fast2SMS gateway request timed out (8s limit).');
          resolve({ success: false, error: 'SMS provider request timed out.' });
        });

        clientReq.on('error', (netErr) => {
          console.error(`[OTP ERROR] Fast2SMS network error: ${netErr.message}`);
          resolve({ success: false, error: 'Network communication failure with SMS provider.' });
        });

        clientReq.write(postPayload);
        clientReq.end();
      });
    }

    // 3. Fallback for unrecognized provider in production
    console.error(`[OTP ERROR] Unsupported SMS_PROVIDER '${provider}' in production environment.`);
    return { success: false, error: `Unsupported SMS provider '${provider}'.` };
  }
}

// ── Cookie & Session Helpers ──
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (name) list[name] = decodeURIComponent(parts.join('='));
  });
  return list;
}

function getAuthenticatedCandidate(req) {
  try {
    const cookies = parseCookies(req);
    let token = cookies['tpf_candidate_session'];
    if (!token && req.headers['authorization']) {
      const authHeader = req.headers['authorization'];
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
    if (!token) return null;

    const row = db.prepare(`
      SELECT c.id, c.mobile, s.token, s.expires_at
      FROM candidate_sessions s
      JOIN candidates c ON c.id = s.candidate_id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(token);

    if (row) {
      return { id: row.id, mobile: row.mobile };
    }
  } catch (e) {
    console.error('[AUTH ERROR] Session verification failed:', e.message);
  }
  return null;
}

function getAuthenticatedAdvisor(req) {
  try {
    const cookies = parseCookies(req);
    let token = cookies['tpf_advisor_session'];
    if (!token && req.headers['authorization']) {
      const authHeader = req.headers['authorization'];
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
    if (!token) return null;

    const row = db.prepare(`
      SELECT a.id, a.username, a.status, s.token, s.expires_at
      FROM advisor_sessions s
      JOIN advisors a ON a.id = s.advisor_id
      WHERE s.token = ? AND a.status = 'active' AND datetime(s.expires_at) > datetime('now')
    `).get(token);

    if (row) {
      return { id: row.id, username: row.username, status: row.status };
    }
  } catch (e) {
    console.error('[ADVISOR AUTH ERROR] Session verification failed:', e.message);
  }
  return null;
}

// ── HTTP Dispatcher & Response Utilities ──
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.mp4':  'video/mp4'
};

function sendJson(res, statusCode, data, extraHeaders = {}, req = null) {
  const origin = (req && req.headers && req.headers.origin) ? req.headers.origin : '*';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-student-id, x-zella-user',
    ...extraHeaders
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    const origin = req.headers.origin || '*';
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-student-id'
    });
    return res.end();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATE AUTHENTICATION ROUTES (OTP & Sessions)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. POST /api/auth/request-otp
  if (method === 'POST' && pathname === '/api/auth/request-otp') {
    try {
      const body = await parseBody(req);
      const cleanMobile = String(body.mobile || '').replace(/[^0-9]/g, '');

      if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]/.test(cleanMobile)) {
        return sendJson(res, 400, {
          success: false,
          error: 'Please provide a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).'
        }, {}, req);
      }

      // Rate limit check: Max 1 unverified OTP per 30 seconds
      const recentOtp = db.prepare(`
        SELECT created_at FROM candidate_otps
        WHERE mobile = ? AND verified = 0 AND datetime(created_at, '+30 seconds') > datetime('now')
        ORDER BY id DESC LIMIT 1
      `).get(cleanMobile);

      if (recentOtp) {
        return sendJson(res, 429, {
          success: false,
          error: 'OTP recently sent. Please wait 30 seconds before requesting again.'
        }, {}, req);
      }

      // Generate 6-digit numeric OTP
      const otp = String(crypto.randomInt(100000, 999999));

      // Insert OTP record (valid 10 minutes)
      const insertResult = db.prepare(`
        INSERT INTO candidate_otps (mobile, otp, attempts, expires_at, verified)
        VALUES (?, ?, 0, datetime('now', '+10 minutes'), 0)
      `).run(cleanMobile, otp);

      const dispatchResult = await OtpProvider.sendOtp(cleanMobile, otp);
      if (!dispatchResult || !dispatchResult.success) {
        // Rollback unverified OTP record if provider dispatch failed
        db.prepare('DELETE FROM candidate_otps WHERE id = ?').run(insertResult.lastInsertRowid);
        return sendJson(res, 502, {
          success: false,
          error: dispatchResult && dispatchResult.error ? dispatchResult.error : 'Failed to dispatch OTP SMS. Please try again later.'
        }, {}, req);
      }

      const isRealProvider = Boolean(process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== 'mock' && process.env.SMS_PROVIDER !== 'console');
      const suppressStagingOtp = process.env.NODE_ENV === 'production' || isRealProvider;
      const responsePayload = {
        success: true,
        message: 'OTP dispatched successfully.',
        stagingOtp: suppressStagingOtp ? undefined : otp
      };

      return sendJson(res, 200, responsePayload, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 2. POST /api/auth/verify-otp
  if (method === 'POST' && pathname === '/api/auth/verify-otp') {
    try {
      const body = await parseBody(req);
      const cleanMobile = String(body.mobile || '').replace(/[^0-9]/g, '');
      const otp = String(body.otp || '').trim();

      if (!cleanMobile || !otp) {
        return sendJson(res, 400, { success: false, error: 'Mobile number and OTP are required.' }, {}, req);
      }

      const activeOtp = db.prepare(`
        SELECT * FROM candidate_otps
        WHERE mobile = ? AND verified = 0 AND datetime(expires_at) > datetime('now')
        ORDER BY id DESC LIMIT 1
      `).get(cleanMobile);

      if (!activeOtp) {
        return sendJson(res, 400, {
          success: false,
          error: 'OTP has expired or does not exist. Please request a new OTP.'
        }, {}, req);
      }

      if (activeOtp.attempts >= 3) {
        return sendJson(res, 429, {
          success: false,
          error: 'Maximum verification attempts exceeded. This OTP is locked. Please request a new OTP.'
        }, {}, req);
      }

      if (activeOtp.otp !== otp) {
        const nextAttempts = activeOtp.attempts + 1;
        db.prepare('UPDATE candidate_otps SET attempts = ? WHERE id = ?').run(nextAttempts, activeOtp.id);
        const remaining = 3 - nextAttempts;
        return sendJson(res, 400, {
          success: false,
          error: remaining > 0 ? `Incorrect OTP. ${remaining} attempt(s) remaining.` : 'Incorrect OTP. Maximum attempts reached. OTP locked.'
        }, {}, req);
      }

      // Mark OTP verified
      db.prepare('UPDATE candidate_otps SET verified = 1 WHERE id = ?').run(activeOtp.id);

      // Upsert candidate record
      let candidate = db.prepare('SELECT id, mobile FROM candidates WHERE mobile = ?').get(cleanMobile);
      if (!candidate) {
        const ins = db.prepare('INSERT INTO candidates (mobile) VALUES (?)').run(cleanMobile);
        candidate = { id: Number(ins.lastInsertRowid), mobile: cleanMobile };
      }

      // Generate secure 32-byte session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      db.prepare(`
        INSERT INTO candidate_sessions (candidate_id, token, expires_at)
        VALUES (?, ?, datetime('now', '+30 days'))
      `).run(candidate.id, sessionToken);

      // Set HttpOnly session cookie (Secure when HTTPS / reverse proxy)
      const isHttps = (req.headers && req.headers['x-forwarded-proto'] === 'https') || (req.socket && req.socket.encrypted);
      const secureFlag = isHttps ? '; Secure' : '';
      const cookieVal = `tpf_candidate_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${secureFlag}`;

      return sendJson(res, 200, {
        success: true,
        candidate: { id: candidate.id, mobile: candidate.mobile },
        token: sessionToken
      }, { 'Set-Cookie': cookieVal }, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 3. GET /api/auth/me
  if (method === 'GET' && pathname === '/api/auth/me') {
    const candidate = getAuthenticatedCandidate(req);
    if (candidate) {
      return sendJson(res, 200, {
        authenticated: true,
        candidate: { id: candidate.id, mobile: candidate.mobile }
      }, {}, req);
    } else {
      return sendJson(res, 200, { authenticated: false }, {}, req);
    }
  }

  // 4. POST /api/auth/logout
  if (method === 'POST' && pathname === '/api/auth/logout') {
    try {
      const cookies = parseCookies(req);
      const token = cookies['tpf_candidate_session'];
      if (token) {
        db.prepare('DELETE FROM candidate_sessions WHERE token = ?').run(token);
      }
      const isHttps = (req.headers && req.headers['x-forwarded-proto'] === 'https') || (req.socket && req.socket.encrypted);
      const secureFlag = isHttps ? '; Secure' : '';
      const clearCookie = `tpf_candidate_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' }, { 'Set-Cookie': clearCookie }, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADVISOR AUTHENTICATION ROUTES (Institutional Wealth Terminal)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. GET /advisor/login
  if (method === 'GET' && pathname === '/advisor/login') {
    const advisor = getAuthenticatedAdvisor(req);
    if (advisor) {
      res.writeHead(302, { 'Location': '/dashboard/' });
      return res.end();
    }
    const loginPath = path.join(__dirname, 'advisor', 'login.html');
    if (fs.existsSync(loginPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(loginPath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Advisor Login Page Not Found');
  }

  // 2. POST /api/advisor/login (Protected by Server-Side Brute-Force Rate Limiting)
  if (method === 'POST' && pathname === '/api/advisor/login') {
    try {
      const body = await parseBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const clientIp = getClientIp(req);

      if (!username || !password) {
        return sendJson(res, 400, { success: false, error: 'Advisor username and password are required.' }, {}, req);
      }

      // Check brute-force rate limit (max 5 failed attempts in 15 minutes per IP:username)
      const rateLimit = checkAdvisorRateLimit(clientIp, username);
      if (rateLimit.locked) {
        return sendJson(res, 429, {
          success: false,
          error: 'Too many failed login attempts. Account access is temporarily locked for 15 minutes. Please try again later.'
        }, {}, req);
      }

      const advisor = db.prepare('SELECT * FROM advisors WHERE username = ? AND status = ?').get(username, 'active');
      if (!advisor || !verifyPassword(password, advisor.password_hash)) {
        // Record failed attempt server-side
        recordAdvisorLoginAttempt(clientIp, username, false);
        const nextAttempts = rateLimit.attempts + 1;
        const remaining = 5 - nextAttempts;
        const warning = remaining > 0
          ? `Invalid advisor credentials. ${remaining} attempt(s) remaining before temporary lockout.`
          : 'Invalid advisor credentials. Account access is now locked for 15 minutes.';
        return sendJson(res, 401, { success: false, error: warning }, {}, req);
      }

      // Successful login resets rate limit counter for this IP and username
      recordAdvisorLoginAttempt(clientIp, username, true);

      // Generate 256-bit cryptographically secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      db.prepare(`
        INSERT INTO advisor_sessions (advisor_id, token, expires_at)
        VALUES (?, ?, datetime('now', '+24 hours'))
      `).run(advisor.id, sessionToken);

      const isHttps = (req.headers && req.headers['x-forwarded-proto'] === 'https') || (req.socket && req.socket.encrypted);
      const secureFlag = isHttps ? '; Secure' : '';
      const cookieVal = `tpf_advisor_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secureFlag}`;
      const clearCandidateCookie = `tpf_candidate_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;

      return sendJson(res, 200, {
        success: true,
        message: 'Advisor authentication successful.',
        advisor: { id: advisor.id, username: advisor.username },
        token: sessionToken
      }, { 'Set-Cookie': [cookieVal, clearCandidateCookie] }, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 3. GET /api/advisor/me
  if (method === 'GET' && pathname === '/api/advisor/me') {
    const advisor = getAuthenticatedAdvisor(req);
    if (advisor) {
      return sendJson(res, 200, {
        authenticated: true,
        advisor: { id: advisor.id, username: advisor.username, status: advisor.status }
      }, {}, req);
    } else {
      return sendJson(res, 200, { authenticated: false }, {}, req);
    }
  }

  // 4. POST /api/advisor/logout
  if (method === 'POST' && pathname === '/api/advisor/logout') {
    try {
      const cookies = parseCookies(req);
      const token = cookies['tpf_advisor_session'];
      if (token) {
        db.prepare('DELETE FROM advisor_sessions WHERE token = ?').run(token);
      }
      const isHttps = (req.headers && req.headers['x-forwarded-proto'] === 'https') || (req.socket && req.socket.encrypted);
      const secureFlag = isHttps ? '; Secure' : '';
      const clearCookie = `tpf_advisor_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`;
      return sendJson(res, 200, { success: true, message: 'Advisor logged out successfully.' }, { 'Set-Cookie': clearCookie }, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACADEMY API ROUTES (Server-Authoritative Progression & Content Gating)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. GET /api/academy/progress
  if (method === 'GET' && pathname === '/api/academy/progress') {
    try {
      const candidate = getAuthenticatedCandidate(req);
      if (!candidate) {
        return sendJson(res, 401, {
          success: false,
          error: 'Unauthorized: Candidate session required. Please log in with OTP.'
        }, {}, req);
      }

      const state = getAuthoritativeCandidateState(candidate.id);
      return sendJson(res, 200, {
        success: true,
        courseId: AUTHORITATIVE_ACADEMY.courseId,
        moduleId: AUTHORITATIVE_ACADEMY.moduleId,
        candidateId: state.candidateId,
        completedLessons: state.completedLessons,
        unlockedLessons: state.unlockedLessons,
        progress: state.progressRows
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 2. POST /api/academy/quiz/submit
  if (method === 'POST' && pathname === '/api/academy/quiz/submit') {
    try {
      const candidate = getAuthenticatedCandidate(req);
      if (!candidate) {
        return sendJson(res, 401, {
          success: false,
          error: 'Unauthorized: Candidate session required. Please log in with OTP.'
        }, {}, req);
      }

      const body = await parseBody(req);
      const { lessonId, answers: submittedAnswers } = body;

      if (!lessonId) {
        return sendJson(res, 400, { success: false, error: 'lessonId is required.' }, {}, req);
      }

      const lessonConfig = AUTHORITATIVE_ACADEMY.lessons[lessonId];
      if (!lessonConfig) {
        return sendJson(res, 404, { success: false, error: `Invalid lessonId: ${lessonId}` }, {}, req);
      }

      const { correctAnswers, passingThreshold, totalQuestions } = lessonConfig.quiz;

      if (!Array.isArray(submittedAnswers) || submittedAnswers.length !== totalQuestions) {
        return sendJson(res, 400, {
          success: false,
          error: `Must submit exactly ${totalQuestions} answers for ${lessonId}.`
        }, {}, req);
      }

      // Authoritative server-side grading
      let score = 0;
      for (let i = 0; i < totalQuestions; i++) {
        if (submittedAnswers[i] === correctAnswers[i]) {
          score++;
        }
      }

      const percentage = Math.round((score / totalQuestions) * 100);
      const passed = percentage >= passingThreshold ? 1 : 0;

      // Record quiz attempt
      db.prepare(`
        INSERT INTO quiz_attempts (candidate_id, lesson_id, score, percentage, passed, submitted_answers)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(candidate.id, lessonId, score, percentage, passed, JSON.stringify(submittedAnswers));

      // Update or insert lesson progress
      const existingProgress = db.prepare(`
        SELECT * FROM lesson_progress
        WHERE candidate_id = ? AND course_id = ? AND module_id = ? AND lesson_id = ?
      `).get(candidate.id, AUTHORITATIVE_ACADEMY.courseId, AUTHORITATIVE_ACADEMY.moduleId, lessonId);

      if (existingProgress) {
        const newBest = Math.max(existingProgress.best_quiz_score, score);
        const newCompleted = (existingProgress.completed === 1 || passed === 1) ? 1 : 0;
        const newPercent = newCompleted === 1 ? 100 : Math.max(existingProgress.completion_percentage, 50);

        db.prepare(`
          UPDATE lesson_progress
          SET last_accessed_at = CURRENT_TIMESTAMP,
              quiz_attempts = quiz_attempts + 1,
              best_quiz_score = ?,
              completed = ?,
              completion_percentage = ?,
              completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = ?
        `).run(newBest, newCompleted, newPercent, passed, existingProgress.id);
      } else {
        db.prepare(`
          INSERT INTO lesson_progress (
            candidate_id, course_id, module_id, lesson_id, completion_percentage,
            completed, quiz_attempts, best_quiz_score, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
        `).run(
          candidate.id, AUTHORITATIVE_ACADEMY.courseId, AUTHORITATIVE_ACADEMY.moduleId,
          lessonId, passed ? 100 : 50, passed, score, passed
        );
      }

      // Re-evaluate authoritative candidate state
      const state = getAuthoritativeCandidateState(candidate.id);

      return sendJson(res, 200, {
        success: true,
        candidateId: candidate.id,
        lessonId,
        score,
        totalQuestions,
        percentage,
        passed: passed === 1,
        passingThreshold,
        completedLessons: state.completedLessons,
        unlockedLessons: state.unlockedLessons
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 3. GET /api/academy/lessons/:lessonId (Protected Content Route)
  if (method === 'GET' && pathname.startsWith('/api/academy/lessons/')) {
    const candidate = getAuthenticatedCandidate(req);
    if (!candidate) {
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Candidate session required. Please log in with OTP.'
      }, {}, req);
    }

    const requestedLessonId = pathname.replace('/api/academy/lessons/', '').trim();
    const lessonConfig = AUTHORITATIVE_ACADEMY.lessons[requestedLessonId];

    if (!lessonConfig) {
      return sendJson(res, 404, { success: false, error: `Lesson ${requestedLessonId} not found.` }, {}, req);
    }

    const state = getAuthoritativeCandidateState(candidate.id);
    if (!state.unlockedLessons.includes(requestedLessonId)) {
      return sendJson(res, 403, {
        success: false,
        isLocked: true,
        error: `Forbidden: Lesson ${requestedLessonId} is locked. You must complete the prerequisite lesson with >=70% score.`
      }, {}, req);
    }

    // Access GRANTED — Load lesson from academy/data
    const lessonFileName = `${requestedLessonId.toLowerCase().replace('m01_l', 'lesson')}.json`;
    const lessonJsonPath = path.join(__dirname, 'academy', 'data', lessonFileName);

    if (fs.existsSync(lessonJsonPath)) {
      const content = JSON.parse(fs.readFileSync(lessonJsonPath, 'utf8'));
      return sendJson(res, 200, { success: true, lesson: content }, {}, req);
    } else {
      return sendJson(res, 200, {
        success: true,
        message: `Lesson ${requestedLessonId} is unlocked but content file pending.`
      }, {}, req);
    }
  }

  // 4. Block direct access to authoritative quiz files
  if (pathname.includes('_quiz.json')) {
    return sendJson(res, 403, {
      success: false,
      error: 'Forbidden: Authoritative quiz answer files cannot be accessed directly.'
    }, {}, req);
  }

  // 5. Protected Static Route for Lesson JSON files (Prevent direct static bypass)
  if (pathname.includes('/data/lesson') && pathname.endsWith('.json')) {
    const match = pathname.match(/lesson(\d+)\.json/i);
    if (match) {
      const candidate = getAuthenticatedCandidate(req);
      if (!candidate) {
        return sendJson(res, 401, {
          success: false,
          error: 'Unauthorized: Candidate session required.'
        }, {}, req);
      }
      const num = parseInt(match[1], 10);
      const lessonKey = `M01_L${num.toString().padStart(2, '0')}`;
      const state = getAuthoritativeCandidateState(candidate.id);

      if (!state.unlockedLessons.includes(lessonKey)) {
        return sendJson(res, 403, {
          success: false,
          isLocked: true,
          error: `Forbidden: Lesson ${lessonKey} is locked for this candidate.`
        }, {}, req);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ADVISOR CRM ROUTES (Strict Server-Side Authorization Enforced)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Fetch all leads (Requires Advisor Session)
  if (method === 'GET' && pathname === '/api/leads') {
    const advisor = getAuthenticatedAdvisor(req);
    if (!advisor) {
      const candidate = getAuthenticatedCandidate(req);
      if (candidate) {
        return sendJson(res, 403, {
          success: false,
          error: 'Forbidden: Academy candidates are not authorized to access CRM pipelines.'
        }, {}, req);
      }
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Advisor authentication required to view client records.'
      }, {}, req);
    }
    try {
      const list = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
      return sendJson(res, 200, { success: true, count: list.length, data: list }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 2. Insert new lead (Requires Advisor Session)
  if (method === 'POST' && pathname === '/api/leads') {
    const advisor = getAuthenticatedAdvisor(req);
    if (!advisor) {
      const candidate = getAuthenticatedCandidate(req);
      if (candidate) {
        return sendJson(res, 403, {
          success: false,
          error: 'Forbidden: Academy candidates are not authorized to manage CRM leads.'
        }, {}, req);
      }
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Advisor authentication required to add leads.'
      }, {}, req);
    }
    try {
      const body = await parseBody(req);
      const { name, contact } = body;
      if (!name || !contact) {
        return sendJson(res, 400, { success: false, error: 'Name and contact are required.' }, {}, req);
      }
      const insert = db.prepare(`
        INSERT INTO leads (name, contact, angel_code, bse_ucc, status)
        VALUES (?, ?, null, null, 'Locked')
      `);
      insert.run(name, contact);
      return sendJson(res, 200, { success: true, message: 'Lead added successfully' }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 3. Map client (Requires Advisor Session)
  if (method === 'POST' && pathname === '/api/leads/map') {
    const advisor = getAuthenticatedAdvisor(req);
    if (!advisor) {
      const candidate = getAuthenticatedCandidate(req);
      if (candidate) {
        return sendJson(res, 403, {
          success: false,
          error: 'Forbidden: Academy candidates are not authorized to map clients.'
        }, {}, req);
      }
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Advisor authentication required to map client codes.'
      }, {}, req);
    }
    try {
      const body = await parseBody(req);
      const { id, angel_code, bse_ucc, status } = body;
      if (!id) return sendJson(res, 400, { success: false, error: 'Lead ID is required.' }, {}, req);

      db.prepare(`
        UPDATE leads
        SET angel_code = COALESCE(?, angel_code),
            bse_ucc = COALESCE(?, bse_ucc),
            status = ?
        WHERE id = ?
      `).run(angel_code || null, bse_ucc || null, status, id);

      return sendJson(res, 200, { success: true, message: 'Client mapped successfully.' }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 4. Fetch all academy students & progression status (Requires Advisor Session)
  if (method === 'GET' && pathname === '/api/admin/students') {
    const advisor = getAuthenticatedAdvisor(req);
    if (!advisor) {
      const candidate = getAuthenticatedCandidate(req);
      if (candidate) {
        return sendJson(res, 403, {
          success: false,
          error: 'Forbidden: Candidates cannot access the admin student management pipeline.'
        }, {}, req);
      }
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Advisor authentication required to view student records.'
      }, {}, req);
    }
    try {
      const candidates = db.prepare('SELECT id, mobile, created_at FROM candidates ORDER BY id DESC').all();
      const progressRows = db.prepare(`
        SELECT candidate_id, lesson_id, completion_percentage, completed, best_quiz_score, last_accessed_at, completed_at
        FROM lesson_progress
      `).all();
      const attemptRows = db.prepare(`
        SELECT candidate_id, lesson_id, score, percentage, passed, created_at
        FROM quiz_attempts
        ORDER BY id DESC
      `).all();

      const students = candidates.map(c => {
        const cProgress = progressRows.filter(p => p.candidate_id === c.id);
        const cAttempts = attemptRows.filter(a => a.candidate_id === c.id);
        const completedCount = cProgress.filter(p => p.completed === 1).length;
        
        const authoritativeState = getAuthoritativeCandidateState(c.id);
        const unlockedCount = authoritativeState.unlockedLessons.length;
        const currentLesson = authoritativeState.unlockedLessons[unlockedCount - 1] || 'M01_L01';
        const overallPercentage = Math.round((completedCount / 20) * 100);

        let latestActive = c.created_at;
        if (cProgress.length > 0) {
          const sorted = [...cProgress].sort((a,b) => (b.last_accessed_at || '').localeCompare(a.last_accessed_at || ''));
          if (sorted[0] && sorted[0].last_accessed_at) latestActive = sorted[0].last_accessed_at;
        }

        return {
          id: c.id,
          mobile: c.mobile,
          registered_at: c.created_at,
          lessons_completed: completedCount,
          current_lesson: currentLesson,
          overall_percentage: overallPercentage,
          total_quiz_attempts: cAttempts.length,
          last_active: latestActive,
          status: completedCount >= 20 ? 'Certified' : (completedCount > 0 ? 'Learning' : 'Enrolled')
        };
      });

      return sendJson(res, 200, {
        success: true,
        count: students.length,
        totalEnrolled: students.length,
        certifiedCount: students.filter(s => s.lessons_completed >= 20).length,
        learningCount: students.filter(s => s.lessons_completed > 0 && s.lessons_completed < 20).length,
        data: students
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 5. API Health Check
  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'online',
      brand: 'TrustPoint Finance',
      academySecurity: 'ACTIVE (Server-Authoritative V3.0)',
      advisorSecurity: 'ACTIVE (Separate Advisor Session & Gating)',
      journalEngine: 'ACTIVE (TrustPoint Zella AI Journal V1.0)',
      time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      database: 'SQLite (node:sqlite) Active'
    }, {}, req);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TRUSTPOINT ZELLA — AI TRADING JOURNAL API ROUTES (Email/Phone Login + Partner Check)
  // ══════════════════════════════════════════════════════════════════════════

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_users (
        user_id TEXT PRIMARY KEY,
        identifier TEXT UNIQUE,
        name TEXT,
        plan_tier TEXT DEFAULT 'FREE_STARTER',
        mapped_angel_code TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) {}

  // Checks if an Angel One Client ID / BSE UCC / Phone belongs to THIS Authorised Partner's mapped clients
  function checkAngelOnePartnerMapping(clientIdInput, userIdentifier = '') {
    const cleanCode = String(clientIdInput || '').trim().toUpperCase();
    const cleanPhone = String(userIdentifier || '').replace(/[^0-9]/g, '').slice(-10);

    // 1. Check authoritative CRM `leads` table (managed by Advisor in /dashboard/ or synced from Angel One NXT)
    if (cleanCode) {
      const matchedLead = db.prepare(`
        SELECT * FROM leads
        WHERE UPPER(TRIM(COALESCE(angel_code, ''))) = ?
           OR UPPER(TRIM(COALESCE(bse_ucc, ''))) = ?
      `).get(cleanCode, cleanCode);

      if (matchedLead) {
        return {
          isMappedPartnerClient: true,
          matchedCode: cleanCode,
          clientName: matchedLead.name || 'Verified Partner Client',
          source: 'CRM_MASTER_LIST'
        };
      }

      // Built-in Demo Mapped Partner Codes for instant testing (TPF* or ANGELPRO*)
      if (cleanCode.startsWith('TPF') || cleanCode === 'ANGELPRO' || cleanCode === 'A1001') {
        return {
          isMappedPartnerClient: true,
          matchedCode: cleanCode,
          clientName: 'TrustPoint Mapped Partner Client',
          source: 'PARTNER_TAG_VERIFIED'
        };
      }
    }

    // 2. Also check if user's 10-digit mobile number is already mapped in `leads` with an active Angel code
    if (cleanPhone && cleanPhone.length === 10) {
      const phoneLead = db.prepare(`
        SELECT * FROM leads
        WHERE REPLACE(REPLACE(REPLACE(COALESCE(contact, ''), ' ', ''), '+', ''), '-', '') LIKE ?
          AND (angel_code IS NOT NULL AND TRIM(angel_code) != '')
      `).get(`%${cleanPhone}`);

      if (phoneLead) {
        return {
          isMappedPartnerClient: true,
          matchedCode: phoneLead.angel_code,
          clientName: phoneLead.name,
          source: 'MOBILE_CRM_MATCH'
        };
      }
    }

    return {
      isMappedPartnerClient: false,
      matchedCode: cleanCode || null,
      clientName: null,
      source: 'EXTERNAL_OR_UNMAPPED'
    };
  }

  function resolveJournalUserId(req) {
    const headerUser = req.headers['x-zella-user'] || parsedUrl.query.userId;
    if (headerUser && String(headerUser).trim()) {
      return String(headerUser).trim().slice(0, 64);
    }
    const cand = getAuthenticatedCandidate(req);
    if (cand && cand.id) return `cand_${cand.id}`;
    const adv = getAuthenticatedAdvisor(req);
    if (adv && adv.id) return `adv_${adv.id}`;
    return 'default';
  }

  // Easy 1-Step Email or Phone Number Login for Traders
  if (method === 'POST' && pathname === '/api/journal/auth') {
    try {
      const body = await parseBody(req);
      const rawIdentifier = String(body.identifier || '').trim().toLowerCase();
      const rawName = String(body.name || '').trim();
      if (!rawIdentifier || rawIdentifier.length < 4) {
        return sendJson(res, 400, { success: false, error: 'Please enter a valid Email or 10-digit Mobile Number.' }, {}, req);
      }

      const isEmail = rawIdentifier.includes('@');
      const cleanMobile = rawIdentifier.replace(/[^0-9]/g, '');
      if (!isEmail && cleanMobile.length < 10) {
        return sendJson(res, 400, { success: false, error: 'Enter a valid 10-digit mobile number or email address.' }, {}, req);
      }

      const normalizedId = isEmail ? rawIdentifier : cleanMobile.slice(-10);
      const userId = 'usr_' + crypto.createHash('sha1').update(normalizedId).digest('hex').slice(0, 12);
      const displayName = rawName || (isEmail ? normalizedId.split('@')[0] : `+91 ${normalizedId}`);

      // Check if their phone number is already mapped in the Advisor's CRM leads table
      const mappingCheck = checkAngelOnePartnerMapping('', normalizedId);
      let existingUser = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId);

      if (!existingUser) {
        const initialPlan = mappingCheck.isMappedPartnerClient ? 'PARTNER_PRO' : 'FREE_STARTER';
        db.prepare(`
          INSERT INTO journal_users (user_id, identifier, name, plan_tier, mapped_angel_code)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, normalizedId, displayName, initialPlan, mappingCheck.matchedCode || null);
        existingUser = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId);
      } else if (mappingCheck.isMappedPartnerClient && existingUser.plan_tier !== 'PARTNER_PRO') {
        db.prepare(`
          UPDATE journal_users SET plan_tier = 'PARTNER_PRO', mapped_angel_code = ? WHERE user_id = ?
        `).run(mappingCheck.matchedCode, userId);
        existingUser.plan_tier = 'PARTNER_PRO';
        existingUser.mapped_angel_code = mappingCheck.matchedCode;
      }

      return sendJson(res, 200, {
        success: true,
        user: {
          userId: existingUser.user_id,
          identifier: existingUser.identifier,
          name: existingUser.name || displayName,
          planTier: existingUser.plan_tier || 'FREE_STARTER',
          mappedAngelCode: existingUser.mapped_angel_code || null
        },
        message: existingUser.plan_tier === 'PARTNER_PRO'
          ? `Welcome ${displayName}! Your account is mapped under TrustPoint Partner Pro (Unlimited Free).`
          : `Welcome ${displayName}! Logged in on Free Starter Tier (Connect your mapped Angel One account anytime to unlock Unlimited Pro).`
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // Verify Angel One Client ID / BSE UCC against Advisor's Mapped Client List
  if (method === 'POST' && pathname === '/api/journal/verify-partner') {
    try {
      const userId = resolveJournalUserId(req);
      const body = await parseBody(req);
      const clientCode = String(body.clientId || body.angel_code || '').trim().toUpperCase();
      if (!clientCode) {
        return sendJson(res, 400, { success: false, error: 'Please enter your Angel One Client ID or BSE UCC.' }, {}, req);
      }

      const check = checkAngelOnePartnerMapping(clientCode, '');
      if (!check.isMappedPartnerClient) {
        return sendJson(res, 200, {
          success: true,
          partnerVerified: false,
          planTier: 'FREE_STARTER',
          clientCode,
          message: `Client ID "${clientCode}" is NOT mapped under TrustPoint Finance's Angel One Partner Tag (it belongs to another partner or direct account). You remain on the Free Starter Plan (30 trades/month). Open a free account via our Partner Link or request AP Remapping to unlock Unlimited Pro for ₹0.`
        }, {}, req);
      }

      // Upgrade user in journal_users
      db.prepare(`
        INSERT INTO journal_users (user_id, identifier, name, plan_tier, mapped_angel_code)
        VALUES (?, ?, ?, 'PARTNER_PRO', ?)
        ON CONFLICT(user_id) DO UPDATE SET plan_tier = 'PARTNER_PRO', mapped_angel_code = excluded.mapped_angel_code
      `).run(userId, userId, check.clientName || 'Partner Client', check.matchedCode);

      return sendJson(res, 200, {
        success: true,
        partnerVerified: true,
        planTier: 'PARTNER_PRO',
        clientCode: check.matchedCode,
        clientName: check.clientName,
        message: `✅ Verified! Angel One ID "${check.matchedCode}" is officially mapped under TrustPoint Finance. Unlimited Partner Pro unlocked for ₹0!`
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'GET' && pathname === '/api/journal/bootstrap') {
    try {
      const userId = resolveJournalUserId(req);
      const accountFilter = parsedUrl.query.account_id || parsedUrl.query.accountId || 'ALL';
      const userProfile = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId) || null;

      let rawTrades = db.prepare(
        'SELECT * FROM journal_trades WHERE COALESCE(user_id, \'default\') = ? ORDER BY entry_date DESC, id DESC'
      ).all(userId);

      const trades = rawTrades.map(t => {
        const mistakes = (() => { try { return JSON.parse(t.mistakes || '[]'); } catch (_) { return []; } })();
        const executions = (() => { try { return JSON.parse(t.executions_json || '[]'); } catch (_) { return []; } })();
        let taxObj = (() => { try { return JSON.parse(t.tax_breakdown || '{}'); } catch (_) { return {}; } })();
        if (!taxObj || !taxObj.totalCharges) {
          taxObj = calculateIndianStatutoryTaxes(t);
        }
        return {
          ...t,
          account_id: t.account_id || (t.segment === 'NSE Equity' ? 'Swing & Cash Equity' : 'Angel One F&O'),
          mistakes,
          executions,
          tax_breakdown: taxObj
        };
      });

      const filteredForAnalytics = accountFilter !== 'ALL'
        ? trades.filter(t => t.account_id === accountFilter)
        : trades;

      const playbooks = db.prepare('SELECT * FROM journal_playbooks ORDER BY created_at ASC').all().map(pb => ({
        ...pb,
        entry_rules: (() => { try { return JSON.parse(pb.entry_rules || '[]'); } catch (_) { return []; } })(),
        exit_rules: (() => { try { return JSON.parse(pb.exit_rules || '[]'); } catch (_) { return []; } })(),
        risk_rules: (() => { try { return JSON.parse(pb.risk_rules || '[]'); } catch (_) { return []; } })()
      }));
      const notes = db.prepare(
        'SELECT * FROM journal_notes WHERE COALESCE(user_id, \'default\') = ? ORDER BY note_date DESC, id DESC'
      ).all(userId);
      const analytics = computeJournalAnalytics(filteredForAnalytics, playbooks);
      return sendJson(res, 200, {
        success: true,
        userId,
        userProfile,
        trades,
        playbooks,
        notes,
        analytics
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'POST' && pathname === '/api/journal/trades') {
    try {
      const userId = resolveJournalUserId(req);
      const userProfile = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId);
      const planTier = userProfile ? userProfile.plan_tier : 'FREE_STARTER';
      const isPro = planTier === 'PARTNER_PRO' || planTier === 'PRO_MONTHLY' || planTier === 'PRO_ANNUAL' || planTier === 'ELITE_PRO';

      const existingTradeCount = (db.prepare('SELECT count(*) as count FROM journal_trades WHERE COALESCE(user_id, \'default\') = ?').get(userId) || {}).count || 0;
      if (!isPro && existingTradeCount >= 30) {
        return sendJson(res, 403, {
          success: false,
          limitReached: true,
          upgradeRequired: true,
          error: 'Free Starter Trial limit reached (30 trades). Upgrade to Pro (₹999/mo) or link your Partner account to unlock unlimited trades & live sync.',
          currentCount: existingTradeCount,
          limit: 30
        }, {}, req);
      }

      const body = await parseBody(req);
      if (!body.symbol || body.entry_price === undefined || body.exit_price === undefined) {
        return sendJson(res, 400, { success: false, error: 'Symbol, entry_price, and exit_price are required.' }, {}, req);
      }
      const { grossPnl, netPnl, rMultiple, status, fees, mae, mfe, taxBreakdown } = computeTradeMetrics(body);
      const mistakesStr = JSON.stringify(Array.isArray(body.mistakes) ? body.mistakes : []);
      const defaultExecs = Array.isArray(body.executions) && body.executions.length > 0 ? body.executions : [
        {
          side: (body.direction || 'LONG').toUpperCase() === 'SHORT' ? 'SELL' : 'BUY',
          qty: Number(body.quantity) || 1,
          price: Number(body.entry_price),
          time: body.entry_date || new Date().toISOString().slice(0, 16),
          type: 'ENTRY'
        },
        {
          side: (body.direction || 'LONG').toUpperCase() === 'SHORT' ? 'BUY' : 'SELL',
          qty: Number(body.quantity) || 1,
          price: Number(body.exit_price),
          time: body.exit_date || body.entry_date || new Date().toISOString().slice(0, 16),
          type: 'EXIT'
        }
      ];
      const stmt = db.prepare(`
        INSERT INTO journal_trades (
          user_id, account_id, symbol, segment, direction, entry_date, exit_date,
          entry_price, exit_price, quantity, stop_loss, target_price,
          fees, gross_pnl, net_pnl, r_multiple, status,
          playbook_id, setup_tag, mistakes, emotion_tag, rating,
          mae, mfe, broker, notes, chart_url, executions_json, tax_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        userId,
        body.account_id || ((body.segment || 'NSE F&O') === 'NSE Equity' ? 'Swing & Cash Equity' : 'Angel One F&O'),
        String(body.symbol).toUpperCase().trim(),
        body.segment || 'NSE F&O',
        (body.direction || 'LONG').toUpperCase(),
        body.entry_date || new Date().toISOString().slice(0, 16),
        body.exit_date || body.entry_date || new Date().toISOString().slice(0, 16),
        Number(body.entry_price),
        Number(body.exit_price),
        Number(body.quantity) || 1,
        Number(body.stop_loss) || 0,
        Number(body.target_price) || 0,
        fees,
        grossPnl,
        netPnl,
        rMultiple,
        status,
        body.playbook_id || 'pb-orb-15m',
        body.setup_tag || 'Discretionary',
        mistakesStr,
        body.emotion_tag || 'Focused & Calm',
        Number(body.rating) || 4,
        mae,
        mfe,
        body.broker || 'Angel One',
        body.notes || '',
        body.chart_url || '',
        JSON.stringify(defaultExecs),
        JSON.stringify(taxBreakdown)
      );
      return sendJson(res, 201, { success: true, id: info.lastInsertRowid, netPnl, rMultiple, status, fees, taxBreakdown }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // Real Live Indian Broker REST API Auto-Sync + Automatic Angel One Partner Client Mapping Check
  if (method === 'POST' && pathname === '/api/journal/broker-sync') {
    try {
      const userId = resolveJournalUserId(req);
      const body = await parseBody(req);
      const { broker, clientId, apiKey, accessToken, password, totp, account_id } = body;

      // Step 1: Check if this Angel One / Broker Client ID is mapped under our Partner Tag (`leads` table)
      const partnerCheck = checkAngelOnePartnerMapping(clientId || '', '');
      if (partnerCheck.isMappedPartnerClient) {
        db.prepare(`
          INSERT INTO journal_users (user_id, identifier, name, plan_tier, mapped_angel_code)
          VALUES (?, ?, ?, 'PARTNER_PRO', ?)
          ON CONFLICT(user_id) DO UPDATE SET plan_tier = 'PARTNER_PRO', mapped_angel_code = excluded.mapped_angel_code
        `).run(userId, userId, partnerCheck.clientName || 'Partner Client', partnerCheck.matchedCode);
      }

      // Step 2: Enforce 30-trade Free Starter limit if user is NOT a mapped partner client
      const userProfile = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId);
      const currentPlan = (partnerCheck.isMappedPartnerClient || (userProfile && userProfile.plan_tier === 'PARTNER_PRO'))
        ? 'PARTNER_PRO'
        : 'FREE_STARTER';

      const existingCountRow = db.prepare('SELECT COUNT(*) as cnt FROM journal_trades WHERE COALESCE(user_id, \'default\') = ?').get(userId);
      const existingTradeCount = existingCountRow ? Number(existingCountRow.cnt) : 0;

      const syncResult = await fetchLiveBrokerTrades({
        broker: broker || 'Angel One SmartAPI',
        clientId: clientId || '',
        apiKey: apiKey || '',
        accessToken: accessToken || '',
        password: password || '',
        totp: totp || ''
      });

      let pairedItems = syncResult.pairedTrades || [];
      let cappedByFreeTier = false;
      if (currentPlan === 'FREE_STARTER' && (existingTradeCount + pairedItems.length) > 30) {
        const allowedRemaining = Math.max(0, 30 - existingTradeCount);
        pairedItems = pairedItems.slice(0, allowedRemaining);
        cappedByFreeTier = true;
      }

      const stmt = db.prepare(`
        INSERT INTO journal_trades (
          user_id, account_id, symbol, segment, direction, entry_date, exit_date,
          entry_price, exit_price, quantity, stop_loss, target_price,
          fees, gross_pnl, net_pnl, r_multiple, status,
          playbook_id, setup_tag, mistakes, emotion_tag, rating,
          mae, mfe, broker, notes, executions_json, tax_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let imported = 0;
      for (const raw of pairedItems) {
        if (!raw.symbol) continue;
        const { grossPnl, netPnl, rMultiple, status, fees, mae, mfe, taxBreakdown } = computeTradeMetrics(raw);
        stmt.run(
          userId,
          account_id || raw.account_id || 'Angel One F&O',
          String(raw.symbol).toUpperCase().trim(),
          raw.segment || 'NSE F&O',
          (raw.direction || 'LONG').toUpperCase(),
          raw.entry_date || new Date().toISOString().slice(0, 16),
          raw.exit_date || raw.entry_date || new Date().toISOString().slice(0, 16),
          Number(raw.entry_price) || 100,
          Number(raw.exit_price) || 100,
          Number(raw.quantity) || 1,
          Number(raw.stop_loss) || 0,
          Number(raw.target_price) || 0,
          fees,
          grossPnl,
          netPnl,
          rMultiple,
          status,
          raw.playbook_id || 'pb-orb-15m',
          raw.setup_tag || `${syncResult.broker} Live API`,
          JSON.stringify(Array.isArray(raw.mistakes) ? raw.mistakes : []),
          raw.emotion_tag || 'Focused & Calm',
          Number(raw.rating) || 4,
          mae,
          mfe,
          syncResult.broker,
          raw.notes || `Synced live from ${syncResult.broker} API`,
          JSON.stringify(raw.executions || []),
          JSON.stringify(taxBreakdown)
        );
        imported++;
      }

      const partnerNotice = partnerCheck.isMappedPartnerClient
        ? `✅ Partner Client Verified (${partnerCheck.matchedCode}) — Unlimited Pro Tier Active!`
        : (clientId
            ? `⚠️ Note: Client ID "${clientId}" is not mapped under TrustPoint Finance Partner Tag (Free Starter limit: 30 trades/mo).`
            : '');

      return sendJson(res, 200, {
        success: true,
        broker: syncResult.broker,
        rawFillsCount: syncResult.rawCount,
        imported,
        partnerVerified: partnerCheck.isMappedPartnerClient,
        planTier: currentPlan,
        cappedByFreeTier,
        partnerNotice,
        message: imported > 0
          ? `Synced ${imported} closed trade(s) from ${syncResult.broker}. ${partnerNotice}`
          : `Connected to ${syncResult.broker} live tradebook (${syncResult.rawCount} executions today). ${partnerNotice}`
      }, {}, req);
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'POST' && (pathname === '/api/journal/trades/import' || pathname === '/api/journal/webhook')) {
    try {
      const userId = resolveJournalUserId(req);
      const userProfile = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId);
      const planTier = userProfile ? userProfile.plan_tier : 'FREE_STARTER';
      const isPro = planTier === 'PARTNER_PRO' || planTier === 'PRO_MONTHLY' || planTier === 'PRO_ANNUAL' || planTier === 'ELITE_PRO';

      const existingTradeCount = (db.prepare('SELECT count(*) as count FROM journal_trades WHERE COALESCE(user_id, \'default\') = ?').get(userId) || {}).count || 0;
      if (!isPro && existingTradeCount >= 30) {
        return sendJson(res, 403, {
          success: false,
          limitReached: true,
          upgradeRequired: true,
          error: 'Free Starter Trial limit reached (30 trades). Upgrade to Pro (₹999/mo) or link your Partner account to unlock unlimited trades & live sync.',
          currentCount: existingTradeCount,
          limit: 30
        }, {}, req);
      }

      const body = await parseBody(req);
      const rawItems = Array.isArray(body.trades) ? body.trades : (body.symbol ? [body] : []);
      if (rawItems.length === 0) {
        return sendJson(res, 400, { success: false, error: 'No trades or executions provided.' }, {}, req);
      }
      const pairedItems = pairRawExecutionsFIFO(rawItems, body.broker || 'Broker Sync');
      let itemsToInsert = pairedItems.length > 0 ? pairedItems : rawItems;
      let cappedByFreeTier = false;

      if (!isPro) {
        const allowedRemaining = Math.max(0, 30 - existingTradeCount);
        if (itemsToInsert.length > allowedRemaining) {
          itemsToInsert = itemsToInsert.slice(0, allowedRemaining);
          cappedByFreeTier = true;
        }
      }

      const stmt = db.prepare(`
        INSERT INTO journal_trades (
          user_id, account_id, symbol, segment, direction, entry_date, exit_date,
          entry_price, exit_price, quantity, stop_loss, target_price,
          fees, gross_pnl, net_pnl, r_multiple, status,
          playbook_id, setup_tag, mistakes, emotion_tag, rating,
          mae, mfe, broker, notes, executions_json, tax_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      let imported = 0;
      for (const raw of itemsToInsert) {
        if (!raw.symbol) continue;
        const { grossPnl, netPnl, rMultiple, status, fees, mae, mfe, taxBreakdown } = computeTradeMetrics(raw);
        stmt.run(
          userId,
          body.account_id || raw.account_id || ((raw.segment || 'NSE F&O') === 'NSE Equity' ? 'Swing & Cash Equity' : 'Angel One F&O'),
          String(raw.symbol).toUpperCase().trim(),
          raw.segment || 'NSE F&O',
          (raw.direction || 'LONG').toUpperCase(),
          raw.entry_date || new Date().toISOString().slice(0, 16),
          raw.exit_date || raw.entry_date || new Date().toISOString().slice(0, 16),
          Number(raw.entry_price) || 100,
          Number(raw.exit_price) || 100,
          Number(raw.quantity) || 1,
          Number(raw.stop_loss) || 0,
          Number(raw.target_price) || 0,
          fees,
          grossPnl,
          netPnl,
          rMultiple,
          status,
          raw.playbook_id || 'pb-orb-15m',
          raw.setup_tag || 'Broker Sync',
          JSON.stringify(Array.isArray(raw.mistakes) ? raw.mistakes : []),
          raw.emotion_tag || 'Focused & Calm',
          Number(raw.rating) || 4,
          mae,
          mfe,
          raw.broker || body.broker || 'Angel One',
          raw.notes || 'Imported via Broker Ledger Sync',
          JSON.stringify(raw.executions || []),
          JSON.stringify(taxBreakdown)
        );
        imported++;
      }
      return sendJson(res, 200, {
        success: true,
        imported,
        cappedByFreeTier,
        limitReached: !isPro && (existingTradeCount + imported) >= 30,
        message: cappedByFreeTier
          ? `Free Starter Trial: Imported ${imported} trade(s) to reach the 30-trade cap. Upgrade to Pro (₹999/mo) to unlock unlimited trades!`
          : `Successfully imported ${imported} trade(s).`
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // ── Commercial SaaS Subscription Upgrade Endpoint ──
  if (method === 'POST' && pathname === '/api/journal/subscribe') {
    try {
      const userId = resolveJournalUserId(req);
      const body = await parseBody(req);
      const plan = String(body.plan || 'PRO_MONTHLY').toUpperCase().trim();
      const allowed = ['PRO_MONTHLY', 'PRO_ANNUAL', 'ELITE_PRO', 'PARTNER_PRO'];
      const chosenPlan = allowed.includes(plan) ? plan : 'PRO_MONTHLY';

      let user = db.prepare('SELECT * FROM journal_users WHERE user_id = ?').get(userId);
      if (!user) {
        db.prepare(`
          INSERT INTO journal_users (user_id, identifier, name, plan_tier)
          VALUES (?, ?, ?, ?)
        `).run(userId, userId, 'Subscribed Trader', chosenPlan);
      } else {
        db.prepare('UPDATE journal_users SET plan_tier = ? WHERE user_id = ?').run(chosenPlan, userId);
      }

      return sendJson(res, 200, {
        success: true,
        planTier: chosenPlan,
        message: `Plan updated to ${chosenPlan}. Unlimited Trades, Orderflow Footprint & Strategy Backtester active!`
      }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (pathname.startsWith('/api/journal/trades/') && (method === 'DELETE' || method === 'PUT')) {
    const idStr = pathname.replace('/api/journal/trades/', '').trim();
    const tradeId = parseInt(idStr, 10);
    if (!isNaN(tradeId)) {
      if (method === 'DELETE') {
        db.prepare('DELETE FROM journal_trades WHERE id = ?').run(tradeId);
        return sendJson(res, 200, { success: true }, {}, req);
      }
      if (method === 'PUT') {
        try {
          const body = await parseBody(req);
          const existing = db.prepare('SELECT * FROM journal_trades WHERE id = ?').get(tradeId);
          if (!existing) return sendJson(res, 404, { success: false, error: 'Trade not found' }, {}, req);
          const merged = { ...existing, ...body };
          const { grossPnl, netPnl, rMultiple, status, fees, mae, mfe, taxBreakdown } = computeTradeMetrics(merged);
          const mistakesStr = Array.isArray(merged.mistakes) ? JSON.stringify(merged.mistakes) : (merged.mistakes || '[]');
          db.prepare(`
            UPDATE journal_trades
            SET account_id = ?, symbol = ?, segment = ?, direction = ?, entry_date = ?, exit_date = ?,
                entry_price = ?, exit_price = ?, quantity = ?, stop_loss = ?, target_price = ?,
                fees = ?, gross_pnl = ?, net_pnl = ?, r_multiple = ?, status = ?,
                playbook_id = ?, setup_tag = ?, mistakes = ?, emotion_tag = ?, rating = ?,
                mae = ?, mfe = ?, broker = ?, notes = ?, chart_url = ?, tax_breakdown = ?
            WHERE id = ?
          `).run(
            merged.account_id || 'Angel One F&O',
            String(merged.symbol).toUpperCase().trim(),
            merged.segment || 'NSE F&O',
            (merged.direction || 'LONG').toUpperCase(),
            merged.entry_date,
            merged.exit_date || merged.entry_date,
            Number(merged.entry_price),
            Number(merged.exit_price),
            Number(merged.quantity),
            Number(merged.stop_loss) || 0,
            Number(merged.target_price) || 0,
            fees,
            grossPnl,
            netPnl,
            rMultiple,
            status,
            merged.playbook_id,
            merged.setup_tag,
            mistakesStr,
            merged.emotion_tag,
            Number(merged.rating) || 4,
            mae,
            mfe,
            merged.broker || 'Angel One',
            merged.notes || '',
            merged.chart_url || '',
            JSON.stringify(taxBreakdown),
            tradeId
          );
          return sendJson(res, 200, { success: true, netPnl, rMultiple, status, fees }, {}, req);
        } catch (e) {
          return sendJson(res, 500, { success: false, error: e.message }, {}, req);
        }
      }
    }
  }

  if (method === 'POST' && pathname === '/api/journal/clear') {
    try {
      const userId = resolveJournalUserId(req);
      db.prepare('DELETE FROM journal_trades WHERE COALESCE(user_id, \'default\') = ?').run(userId);
      return sendJson(res, 200, { success: true, message: 'All trades cleared. Ready for your live trades.' }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'POST' && pathname === '/api/journal/reset') {
    try {
      const userId = resolveJournalUserId(req);
      db.prepare('DELETE FROM journal_trades WHERE COALESCE(user_id, \'default\') = ?').run(userId);
      seedDefaultTrades(db, userId);
      return sendJson(res, 200, { success: true, message: 'Journal reset to institutional demo dataset.' }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'POST' && pathname === '/api/journal/playbooks') {
    try {
      const userId = resolveJournalUserId(req);
      const body = await parseBody(req);
      if (!body.name) return sendJson(res, 400, { success: false, error: 'Playbook name is required.' }, {}, req);
      const id = body.id || ('pb-' + Date.now());
      db.prepare(`
        INSERT OR REPLACE INTO journal_playbooks (id, user_id, name, description, market_condition, color, entry_rules, exit_rules, risk_rules)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        body.name,
        body.description || '',
        body.market_condition || 'Trending',
        body.color || '#6366f1',
        JSON.stringify(Array.isArray(body.entry_rules) ? body.entry_rules : []),
        JSON.stringify(Array.isArray(body.exit_rules) ? body.exit_rules : []),
        JSON.stringify(Array.isArray(body.risk_rules) ? body.risk_rules : [])
      );
      return sendJson(res, 201, { success: true, id }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'POST' && pathname === '/api/journal/notes') {
    try {
      const userId = resolveJournalUserId(req);
      const body = await parseBody(req);
      if (!body.title || !body.content) return sendJson(res, 400, { success: false, error: 'Title and content are required.' }, {}, req);
      const info = db.prepare(`
        INSERT INTO journal_notes (user_id, note_date, title, category, mood, content, lessons_learned)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        body.note_date || new Date().toISOString().slice(0, 10),
        body.title,
        body.category || 'Session Review',
        body.mood || 'Focused',
        body.content,
        body.lessons_learned || ''
      );
      return sendJson(res, 201, { success: true, id: info.lastInsertRowid }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  if (method === 'POST' && pathname === '/api/journal/ai-coach') {
    try {
      const userId = resolveJournalUserId(req);
      const body = await parseBody(req);
      const trades = db.prepare(
        'SELECT * FROM journal_trades WHERE COALESCE(user_id, \'default\') = ? ORDER BY entry_date DESC'
      ).all(userId);
      const playbooks = db.prepare('SELECT * FROM journal_playbooks').all();
      const report = await generateAiCoachingReport(trades, playbooks, body.prompt || '');
      return sendJson(res, 200, { success: true, ...report }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATIC FILE SERVING & UNIFIED ROUTING
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Academy redirects & static assets
  if (pathname === '/academy') {
    res.writeHead(302, { 'Location': '/academy/' });
    return res.end();
  }

  if (pathname.startsWith('/academy/')) {
    const acadSub = pathname.replace(/^\/academy/, '');
    const acadFile = (acadSub === '' || acadSub === '/') ? 'index.html' : acadSub.replace(/^\//, '');
    const filePath = path.join(__dirname, 'academy', acadFile);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': req.headers.origin || '*'
      });
      return fs.createReadStream(filePath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found (Academy)');
  }

  // 1b. AI Trading Journal (TrustPoint Zella) redirects & static assets
  if (pathname === '/journal') {
    res.writeHead(302, { 'Location': '/journal/' });
    return res.end();
  }

  if (pathname.startsWith('/journal/')) {
    const journalSub = pathname.replace(/^\/journal/, '');
    const journalFile = (journalSub === '' || journalSub === '/') ? 'index.html' : journalSub.replace(/^\//, '');
    const filePath = path.join(__dirname, 'journal', journalFile);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': req.headers.origin || '*'
      });
      return fs.createReadStream(filePath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found (AI Trading Journal)');
  }

  // 2. Dashboard redirects & static assets (Protected Institutional Cockpit)
  if (pathname === '/dashboard' || pathname === '/dashboard/' || pathname.startsWith('/dashboard/')) {
    // 1. Check if authenticated Advisor
    const advisor = getAuthenticatedAdvisor(req);
    if (!advisor) {
      // Not an advisor: Check if an authenticated Academy Candidate is attempting access -> 403 Forbidden
      const candidate = getAuthenticatedCandidate(req);
      if (candidate) {
        return sendJson(res, 403, {
          success: false,
          error: 'Forbidden: Academy candidates are not authorized to access the Wealth Terminal.'
        }, {}, req);
      }
      const acceptHeader = req.headers['accept'] || '';
      if (acceptHeader.includes('text/html')) {
        res.writeHead(302, { 'Location': '/advisor/login' });
        return res.end();
      }
      return sendJson(res, 401, {
        success: false,
        error: 'Unauthorized: Advisor authentication required to access Wealth Terminal.'
      }, {}, req);
    }

    // 2. Authorized Advisor -> Serve Dashboard
    if (pathname === '/dashboard') {
      res.writeHead(302, { 'Location': '/dashboard/' });
      return res.end();
    }

    const dashSub = pathname.replace(/^\/dashboard/, '');
    const dashFile = (dashSub === '' || dashSub === '/') ? 'index.html' : dashSub.replace(/^\//, '');
    const filePath = path.join(__dirname, 'dashboard', dashFile);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': req.headers.origin || '*'
      });
      return fs.createReadStream(filePath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found (Dashboard)');
  }

  // 3. Public Marketing Website assets (served from public/)
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  const cleanSub = safePath.replace(/^[\/\\]+/, '');

  let publicFilePath = path.join(__dirname, 'public', cleanSub);

  // If path has no extension, check if an HTML file exists in public/ (e.g. /insights -> /insights.html)
  if (!fs.existsSync(publicFilePath) || !fs.statSync(publicFilePath).isFile()) {
    if (!path.extname(cleanSub)) {
      const htmlCandidate = path.join(__dirname, 'public', cleanSub + '.html');
      if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
        publicFilePath = htmlCandidate;
      }
    }
  }

  if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
    const ext = path.extname(publicFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': req.headers.origin || '*'
    });
    return fs.createReadStream(publicFilePath).pipe(res);
  }

  // 4. Secondary fallback: check root directory for any assets
  let rootFilePath = path.join(__dirname, cleanSub);
  if (fs.existsSync(rootFilePath) && fs.statSync(rootFilePath).isFile()) {
    const ext = path.extname(rootFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': req.headers.origin || '*'
    });
    return fs.createReadStream(rootFilePath).pipe(res);
  }

  // 5. 404 Not Found
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

// Start Server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`╔═════════════════════════════════════════════════════════════╗`);
    console.log(`║  TRUSTPOINT FINANCE ACADEMY V3.0 — SERVER ACTIVE            ║`);
    console.log(`║  Port: ${PORT} | Server-Authoritative Candidate Engine      ║`);
    console.log(`║  URL: http://localhost:${PORT}                              ║`);
    console.log(`╚═════════════════════════════════════════════════════════════╝`);
    console.log(`[DATABASE] SQLite file linked at: ${DB_PATH}`);
  });
}

module.exports = { server, db, AUTHORITATIVE_ACADEMY, OtpProvider };
