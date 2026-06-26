# EOD Report Management Platform

A premium, modern EOD (End of Day) Report Management Platform built to help developers seamlessly log daily work, calculate task durations (including overnight shifts), format reports for Slack/Teams, manage multi-project task groupings, and handle automatic daily report submissions.

---

## 🚀 Key Features

*   **📝 Multi-Project Sectioning**: Group Done and In Progress tasks separately per project block.
*   **⏱️ Overnight/Cross-Midnight Durations**: Automatically handles late-night shifts (e.g. `23:00` to `01:00` or `12:00` to `02:00`) by adding 24 hours to output correct duration values instead of returning `—` (dash).
*   **🔗 Unique Project Selection**: Once a project is chosen in one section of the EOD, it is automatically excluded from selection in other sections to prevent duplicates.
*   **💬 Slack-Compatible Formatting**: Copy slack-ready report text with WhatsApp/Slack bold syntax (`*headers*`), inline hours (`Hours Today: 4h 0m | Week Total: 10h 0m`), and automatic fallback placeholders (`• None`) for blank blockers or progress states.
*   **🔒 Date Locking & Validation**: Restricts reports to one entry per day, automatically checking and initializing pages to local browser dates.
*   **📅 Create Past EODs**: Easily submit previous day reports that are missing in your history with automatic draft state recovery.
*   **⏰ Automatic Midnight Submission**: Scans and submits previous day local drafts automatically at midnight, reloading a clean workspace for the new day.
*   **📄 Pagination**: Easily view and browse past records with limit-offset pagination (10 reports per page) coordinated with project and search term filters.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js (App Router, dynamic React state management)
*   **Backend**: Node.js + Express.js API
*   **Database**: PostgreSQL (hosted on Supabase or native instance)
*   **Authentication**: JWT-based secure auth

---

## 📁 Project Structure

```text
EOD-REPORT/
├── backend/                  # Node.js + Express.js API
│   ├── migrations/           # PostgreSQL Migrations (Runs automatically on startup)
│   │   ├── 001_initial.sql   # Initial schema tables
│   │   └── 002_multi_project.sql # Multi-project alterations
│   ├── src/
│   │   ├── controllers/      # Request handlers (Grouping, stats, week totals)
│   │   ├── services/         # Database transaction and aggregation logic
│   │   ├── utils/            # Time parsing and text formatting helpers
│   │   └── index.js          # Entrypoint, migration executor, cron job setup
│   └── package.json
│
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Next.js Pages (Dashboard, Reports page, Reports ID views)
│   │   ├── components/       # UI Components (Sidebar, AppShell, ReportForm)
│   │   ├── hooks/            # Local storage auto-save hooks
│   │   └── lib/              # API clients, toast notifications, UI formatters
│   └── package.json
│
└── scratch/                  # Scripts and integration testing suite
    └── test_api.js           # Integration tests
```

---

## ⚙️ Setup & Local Running Instructions

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+) and [PostgreSQL](https://www.postgresql.org/) installed and running.

### 2. Backend Configuration
Navigate to the `/backend` directory and create a `.env` file containing:
```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
JWT_SECRET=your_super_secret_jwt_key
PORT_FRONTEND=http://localhost:3000
```

### 3. Startup

#### Run Backend Dev Server:
```bash
cd backend
npm install
npm run dev
```
*(Backend migrations will run automatically on startup to initialize schemas.)*

#### Run Frontend Dev Server:
```bash
cd ../frontend
npm install
npm run dev
```
*(Open [http://localhost:3000](http://localhost:3000) in your browser.)*

---

## 🧪 Running Integration Tests
To run API contract verification and test database reads/writes:
```bash
node scratch/test_api.js
```
