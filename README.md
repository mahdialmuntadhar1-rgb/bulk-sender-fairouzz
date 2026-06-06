# 🚀 Nabda WABA Bulk Campaigns Message Sender

A production-safe, rate-limited bulk WhatsApp campaign scheduler and sender designed for Iraqi small businesses. Built with a responsive dark-mode dashboard on the frontend, and a highly-secure Express.js proxy on the backend to avoid browser CORS blocks and protect your secret API Keys.

---

## 📂 Project Structure

```
├── server/
│   ├── index.js          # Express proxy API server with file loggers
│   ├── package.json      # Backend node dependencies
│   └── .env.example      # Guide to configure Nabda key
├── dashboard/
│   ├── index.html        # Responsive frontend control panel markup
│   ├── app.js            # HTML5 CSV parsers, filters, and recursive delay scheduler
│   └── style.css         # UI color themes & range styles overrides
├── data/
│   ├── sent-log.csv      # Log of completed message deliveries
│   ├── failed-log.csv    # Log of message delivery issues & error codes
│   ├── skipped-log.csv   # Log of skipped duplicates/invalid entries
│   ├── do-not-send.csv   # Excluded blacklists of opt-out customers
│   └── campaign-history.json # JSON record ledger of historical campaign runs
└── README.md             # Setup and deployment guides of Iraqi phone normalization
```

---

## ⚙️ Requirements & Rapid Setup

Make sure you have [Node.js (v18+)](https://nodejs.org/) installed before running the following instructions.

### 1. Configure Secret Environment Key
Copy `.env.example` inside the `server` folder to `.env`:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and insert your Nabda API Key:
```env
NABDA_API_KEY=your_exact_hexadecimal_api_key_here
PORT=3001
```
*⚠️ Do NOT prepend `Bearer` to the key. Place the raw key value directly.*

---

## 💻 Running the App

### Option A: Standard Terminal (macOS / Linux / Git Bash)

1. **Install Backend Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Start the Proxy Service**:
   ```bash
   npm start
   ```

3. **Open the Dashboard**:
   Simply open `dashboard/index.html` by double-clicking it in your file systems or using a simple static web server (such as Live Server in VS Code, or `npx serve dashboard`).

---

### Option B: Windows PowerShell Execution Commands

If you're deploying on a local Windows computer, open Windows PowerShell (Admin) and execute the following sequential commands:

```powershell
# 1. Enter the server folder
cd server

# 2. Set strict local policy boundaries if scripts are blocked (Optional)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 3. Install packages
npm install

# 4. Fire up the backend service
npm start
```

---

## 🇮🇶 Iraqi Phone Validation & Normalization Rules

Our scheduler features high-precision sanitization logic for Iraqi telecom carriers (Asiacell, Zain IQ, and Korek), automatically normalizing numbers to the correct WABA `+9647XXXXXXXX` format as follows:

| Input Phone Format | Carrier Detected | Automatically Normalized Output |
| :--- | :--- | :--- |
| `0770 123 4567` | Asiacell | `+9647701234567` |
| `07812345678` | Zain IQ | `+9647812345678` |
| `7501234567` | Korek | `+9647501234567` |
| `964 770 123 4567` | Iraqi Intl | `+9647701234567` |
| `+9647701234567` | Already Correct | `+9647701234567` |

Any numbers with non-Iraqi structures or wrong lengths are logged directly into `/data/skipped-log.csv` with the reason "Invalid Iraqi phone format", keeping your outreach legal and free from spam flags.

---

## ⚖️ Safety Features built-in
- **No CORS Issues**: Calls are proxies from frontend to local express ports, meaning no headers blocks.
- **Do-Not-Send Exclusions**: Before calling Nabda APIs, our engine scans `/data/do-not-send.csv`. Matching target phones are immediately marked as "Excluded" and bypassed safely.
- **Micro-Delay Scheduler**: Adjustable intervals (2 to 20 seconds) ensure messages are not sent in sudden bursts, defending your business number from sudden automated blocks.
- **Transactional CSV Ledgers**: Records are updated instantly in the `data/` folder for audits and spreadsheets imports.
