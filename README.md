# TrustPoint Finance — Universal Wealth & Order Flow Terminal

TrustPoint Finance is an enterprise-grade, glassmorphic Single Page Application (SPA) dashboard paired with an Express.js backend and a SQLite local database. It is designed to seamlessly integrate and leverage:
1. **BSE StAR MF 2.0 Web Services**: For automated mutual fund onboarding (UCC) and SIP purchases.
2. **Angel One SmartAPI**: For live stock holdings, F&O signals, and thematic basket trading.
3. **Turtlemint Insurance POSP Gateway**: For dynamic life and health protection HLV audits.

---

## 🚀 How to Run Locally

Since the codebase is already complete and fully connected to the backend REST APIs, here is how you launch the live server in your local development environment:

### Step 1: Install Dependencies
Open your command terminal (VS Code Terminal, CMD, or PowerShell) inside the `trustpoint-finance` directory and run:
```bash
npm install
```
This will automatically install:
* `express` (Backend API router and static asset server)
* `better-sqlite3` (Ultra-fast, single-file local SQL database)
* `dotenv` (For securing your partner credential environment variables)
* `cors` (Cross-Origin Resource Sharing)
* `nodemon` (For auto-restarting the server during development)

### Step 2: Set Up Credentials (Optional)
Open the `.env` file in the root folder and add your specific:
* AMFI ARN mapping details.
* BSE StAR member credentials.
* Angel One SmartAPI developer tokens.
* Turtlemint partner codes.

### Step 3: Start the Live Server
Run the start command in your terminal:
```bash
npm run start
```
*If you are developing/making changes, you can run `npm run dev` to use nodemon.*

### Step 4: Open in Browser
Once the server logs show:
```
╔════════════════════════════════════════════╗
║  TRUSTPOINT FINANCE COCKPIT — ACTIVE       ║
║  Port: 3000 | Local Server                 ║
║  URL: http://localhost:3000                 ║
╚════════════════════════════════════════════╝
```
Simply open your web browser and go to:
👉 **[http://localhost:3000](http://localhost:3000)**

The entire platform will load dynamically, pulling real CRM data directly from your local SQLite database file (`trustpoint.db`)!

---

## 📂 Project Architecture

```
trustpoint-finance/
│
├── .env                  # Secure credential keys
├── package.json          # Node dependencies and launch scripts
├── trustpoint.db         # The SQLite single-file local database (auto-created)
│
├── server.js             # Express.js REST API Server and Database Controller
│
├── index.html            # Wealth Cockpit HTML structure & tab controllers
├── index.css             # Glassmorphic emerald styles & blurred locker interfaces
└── index.js             # Mathematical compounding, Markowitz Optimizer,
                          # drag-and-drop CSV parser, and live API fetch triggers
```

---

## 💾 SQLite Database Schemas

The database automatically initializes a table named `leads` to maintain your client mapping pipeline.

```sql
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  angel_code TEXT,
  bse_ucc TEXT,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Disclaimers
Mutual Fund investments are subject to market risks. Read all scheme-related documents carefully before investing. Direct equities and F&O trading involve high financial risk.
