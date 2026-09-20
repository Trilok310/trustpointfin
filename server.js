// ── server.js ─────────────────────────────────────────────────────────────────
// TrustPoint Finance Backend API & Academy Authorization Server (V3.0 Staging)
// Pure Native Node Engine: node:http + node:sqlite + node:crypto • Zero External Dependencies
// Server-Authoritative Candidate Authentication, Quiz Grading, Progression & Route Protection

const http   = require('node:http');
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
`);

// Pre-populate default leads if empty
const leadCountRow = db.prepare('SELECT COUNT(*) AS count FROM leads').get();
if (leadCountRow && leadCountRow.count === 0) {
  const insertLead = db.prepare(`
    INSERT INTO leads (name, contact, angel_code, bse_ucc, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertLead.run('Rohan Sharma', '+91 98765 43210', 'ROHA4322', 'UCC-90812', 'Fully Mapped');
  insertLead.run('Priya Patel', '+91 87654 32109', 'PRIY8901', null, 'Only F&O');
  insertLead.run('Amit Verma', '+91 76543 21098', null, null, 'Locked');
  console.log('[DATABASE] Pre-populated default CRM leads successfully.');
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

// ── OTP Provider Abstraction ──
class OtpProvider {
  static async sendOtp(mobile, otp) {
    console.log(`[OTP DISPATCH] Destination: +91 ${mobile} | Code: ${otp} (Valid for 10 min)`);
    return { success: true };
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
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, data, extraHeaders = {}, req = null) {
  const origin = (req && req.headers && req.headers.origin) ? req.headers.origin : '*';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-student-id',
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
      db.prepare(`
        INSERT INTO candidate_otps (mobile, otp, attempts, expires_at, verified)
        VALUES (?, ?, 0, datetime('now', '+10 minutes'), 0)
      `).run(cleanMobile, otp);

      await OtpProvider.sendOtp(cleanMobile, otp);

      const responsePayload = {
        success: true,
        message: 'OTP dispatched successfully.',
        stagingOtp: process.env.NODE_ENV === 'production' ? undefined : otp
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

      // Set HttpOnly session cookie
      const cookieVal = `tpf_candidate_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`;

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
      const clearCookie = 'tpf_candidate_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' }, { 'Set-Cookie': clearCookie }, req);
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
  // EXISTING CRM ROUTES (Preserved 100%)
  // ══════════════════════════════════════════════════════════════════════════

  // 1. Fetch all leads
  if (method === 'GET' && pathname === '/api/leads') {
    try {
      const list = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
      return sendJson(res, 200, { success: true, count: list.length, data: list }, {}, req);
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message }, {}, req);
    }
  }

  // 2. Insert new lead
  if (method === 'POST' && pathname === '/api/leads') {
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

  // 3. Map client
  if (method === 'POST' && pathname === '/api/leads/map') {
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

  // 4. API Health Check
  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'online',
      brand: 'TrustPoint Finance',
      academySecurity: 'ACTIVE (Server-Authoritative V3.0)',
      time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
      database: 'SQLite (node:sqlite) Active'
    }, {}, req);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATIC FILE SERVING
  // ══════════════════════════════════════════════════════════════════════════
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  // Check if requesting academy files
  let filePath = path.join(__dirname, safePath);
  if (pathname.startsWith('/academy')) {
    const acadSub = pathname.replace('/academy', '');
    filePath = path.join(__dirname, 'academy', acadSub || '/index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': req.headers.origin || '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback to index.html
    const fallbackPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(fallbackPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
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

module.exports = { server, db, AUTHORITATIVE_ACADEMY };
