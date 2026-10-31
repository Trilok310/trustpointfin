# TrustPoint Finance — Universal Wealth Terminal & Zella AI Trading Journal

TrustPoint Finance (`trustpointfin`) is an enterprise-grade fintech ecosystem combining a public financial advisory portal, a server-authoritative Stock Market Academy, an Institutional Wealth Terminal, and **TrustPoint Zella — an AI-Powered Trading Journal modeled after TradeZella**.

## 🌟 Core Platform Modules

### 1. ⚡ TrustPoint Zella — AI Trading Journal (`/journal/`)
A full-stack, dark-mode **React + Tailwind CSS + SQLite + AI Coach** trading journal designed for Indian Equity, Nifty/BankNifty F&O, Commodity, and Multi-Asset traders:
- **Dashboard & 6-Factor Zella Edge Score (0–100)**: Evaluates your quantitative trading edge across *Win Rate %*, *Profit Factor*, *Avg Win/Loss Ratio*, *Recovery Factor*, *Max Drawdown Control*, and *Rule Discipline*.
- **Interactive P&L Heatmap Calendar**: Signature TradeZella monthly calendar view with daily Net P&L, trade count, R-multiple badges, weekly rollup sidebar (Weeks 1–5), and 1-click day drilldowns.
- **Trade Log & Execution Replay Inspector**: Filter trades by Segment (`NSE F&O`, `NSE Equity`), Side (`LONG`/`SHORT`), Playbook, or Mistake Tag. Inspect any trade with the **Excursion Replay Bar** (`Stop Loss` ↔ `Entry` ↔ `Exit` ↔ `Target` + MAE/MFE points).
- **Institutional Strategy Playbooks**: Track live Win Rate, Profit Factor, Expectancy, and Avg R-Multiple across strategies (*15m Opening Range Breakout (ORB)*, *Institutional VWAP + 20 EMA Pullback*, *PDH/PDL Liquidity Sweep*, *Stage-2 VCP / CAN SLIM Breakout*) with Entry/Exit/Risk rule checklists.
- **Zella AI Performance Coach & Leak Detector**:
  - Calculates the exact rupee cost of psychological mistakes (`Revenge Trade`, `FOMO Entry`, `Moved Stop Loss`, `Overtrading`, `Expiry Over-leverage`).
  - Runs counterfactual **"What-If Mistake Eliminator"** simulations showing your clean account equity without unforced errors.
  - Interactive AI Coach powered by `@google/generative-ai` (Gemini) + deterministic quantitative diagnostics.
- **Universal Broker Sync & CSV Import**:
  - **1-Click Angel One SmartAPI Orderbook Sync**
  - Drag-and-drop CSV importer supporting **Zerodha Kite/Console**, **Angel One**, **Upstox**, **MT4/MT5**, and **cTrader**.

### 2. 🎓 TrustPoint Stock Market Academy (`/academy/`)
- Server-authoritative 20-lesson Hindi & English Stock Market Foundations curriculum (`SMF_HINDI`) with OTP authentication, progressive lesson unlocking, and server-graded quizzes.

### 3. 🛡️ Institutional Wealth & Order Flow Cockpit (`/dashboard/`)
- Protected Advisor CRM pipeline, Markowitz Portfolio Optimizer, Goal SIP Planner, and Turtlemint Insurance Human Life Value (HLV) audit engine.

---

## 🚀 How to Run Locally

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Server
```bash
npm run start
```

### Step 3: Access the Ecosystem
- **Public Homepage**: `http://localhost:3000/`
- **TrustPoint Zella AI Trading Journal**: `http://localhost:3000/journal/`
- **Stock Market Academy**: `http://localhost:3000/academy/`
- **Advisor Login & Wealth Cockpit**: `http://localhost:3000/advisor/login` → `http://localhost:3000/dashboard/`

---

## 🔌 AI Trading Journal REST API Endpoints (`/api/journal/*`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/journal/bootstrap` | Returns all trades, playbooks, session notes, and 6-factor Zella Score analytics |
| `POST` | `/api/journal/trades` | Logs a new trade with automatic Gross/Net P&L and R-Multiple calculation |
| `POST` | `/api/journal/trades/import` | Bulk imports trades from Angel One SmartAPI or Broker CSV |
| `PUT` | `/api/journal/trades/:id` | Updates trade notes, mistake tags, SL/Target, or playbook assignment |
| `DELETE` | `/api/journal/trades/:id` | Deletes a trade record from SQLite |
| `POST` | `/api/journal/playbooks` | Creates or updates a trading strategy playbook |
| `POST` | `/api/journal/notes` | Saves a Daily Trading Notebook entry (Pre-Market Plan / Session Review) |
| `POST` | `/api/journal/ai-coach` | Generates an AI behavioral & quantitative audit of the trader's journal |

---

## 📂 Project Architecture

```text
trustpoint-finance/
├── server.js                  # Native Node HTTP + SQLite Server (Academy, CRM & Zella Journal APIs)
├── services/
│   └── journalEngine.js       # Zella Score 6-Factor Analytics, SQLite Schema & AI Coach Engine
├── journal/
│   ├── index.html             # TrustPoint Zella — React 18 + Tailwind CSS Entry Point
│   └── app.js                 # Full TradeZella UI (Dashboard, P&L Calendar, Replay, Playbooks, AI Coach)
├── academy/                   # Interactive Stock Market Academy Player
├── dashboard/                 # Institutional Advisor Wealth Terminal
├── public/                    # Public Marketing & Insights Portal
└── README.md                  # Repository Documentation
```
