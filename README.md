# Bloom Conference 2026 — Registration System

A ladies-only conference registration form with:
- Static frontend (vanilla HTML/CSS/JS)
- Google Apps Script backend (saves to Google Sheets, uploads payment proofs to Drive)
- No secrets in the repository

---

## Quick Start (Local Dev)

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Then copy `public/config.js.example` → `public/config.js` and set your Apps Script URL.

---

## Deployment Guide

### 1. Backend — Google Apps Script

1. Create a **new Google Spreadsheet** for Bloom 2026.
2. Go to **Extensions → Apps Script**.
3. Paste the contents of `backend/Code.gs`.
4. In `Code.gs`, replace `YOUR_DRIVE_FOLDER_ID` with your Google Drive folder ID.
   - Find it in your folder URL: `https://drive.google.com/drive/folders/**THIS_PART**`
5. Click **Deploy → New Deployment**:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the `/exec` URL — you'll need it in the next step.

### 2. Frontend — Config File

Create `public/config.js` on your server (based on `public/config.js.example`):

```js
window.APP_CONFIG = {
  googleScriptUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
};
```

> ⚠️ **NEVER commit `config.js` to git.** It is gitignored. Upload it to your server manually.

### 3. Deployment

Use the gitignored `deploy.sh` script to push frontend files directly to the live server via SFTP:

```bash
# Deploy specific files
./deploy.sh public/dashboard.html public/dashboard.js

# Deploy full suite
./deploy.sh
```

Credentials are loaded automatically from the gitignored `.env` file (copy `.env.example` → `.env` and fill in values). See `deployment_checklist.md` for full setup instructions.

### 4. Apache `.htaccess` Setup (Clean URLs)

If you are hosting this alongside WordPress and want clean vanity URLs, place the following rules in your `.htaccess` file **before** the `# BEGIN WordPress` block:

```apache
# Acts Church Conference — Custom Rewrite Rules
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

# 1. Page Routes
RewriteRule ^register/?$ /bloom2026/index.html [L,QSA]
RewriteRule ^dashboard/?$ /bloom2026/dashboard.html [L,QSA]
RewriteRule ^registrants/?$ /bloom2026/registrants.html [L,QSA]
RewriteRule ^verify-payments/?$ /bloom2026/verify-payments.html [L,QSA]

# 2. Asset Routes (Intercept CSS, JS, and images from vanity URLs)
RewriteCond %{REQUEST_URI} !^/bloom2026/
RewriteRule ^(?:register/|dashboard/|registrants/|verify-payments/)?(styles\.css|app\.js|dashboard\.js|registrants\.js|verify-payments\.js|config\.js|acts-logo\.png|registration-form-banner\.png)$ /bloom2026/$1 [L,QSA]
</IfModule>
```

> **Note:** `RewriteBase /` and the `RewriteCond !^/bloom2026/` guard are critical to prevent Apache rewrite loops (`HTTP 500`) when assets are re-requested from vanity URL paths.

---

## Security

| What | Where | Notes |
|------|-------|-------|
| Google Apps Script URL | `public/config.js` | Gitignored — deploy manually |
| Google Drive Folder ID | `backend/Code.gs` | Never in frontend |
| Google Sheet ID | Implicit (bound to Sheet) | Never in frontend |

The public repo contains **zero real IDs or secrets**.

---

## Form Fields

| Field | Type | Required |
|-------|------|----------|
| Full Name | Text | ✅ |
| Email Address | Email | ✅ |
| Phone Number | Tel | ✅ |
| Age Range | Dropdown | ✅ |
| Marital Status | Dropdown | ✅ |
| Church Plant | Dropdown | ✅ |
| Church Plant (Others) | Text | If "Others" selected |
| Homes Code | Text | Optional |
| Workshop | Dropdown | ✅ |
| First Bloom Conference? | Radio | ✅ |
| Proof of Payment | File upload | ✅ |
| Additional Remarks | Textarea | Optional |

---

## File Structure

```
bloom-conference-2026/
├── public/
│   ├── index.html          # Registration form (trilingual EN/中文/BM)
│   ├── dashboard.html      # Sign up metrics & analytics dashboard
│   ├── dashboard.js        # Dashboard data fetching and chart rendering
│   ├── registrants.html    # Attendees directory table (Name, Church Plant, Homes Code)
│   ├── registrants.js      # Registrants table search, filtering, and rendering
│   ├── verify-payments.html# Payment verification & approval reviewer portal
│   ├── verify-payments.js  # Payment verification auth, approval action, and receipt modal logic
│   ├── styles.css          # Design system (Soft floral palette, responsive layout, portal UI)
│   ├── app.js              # Form logic, validation, submission
│   ├── acts-logo.png       # Acts Church branding logo
│   └── config.js.example   # Template — copy to config.js and fill in URL
├── backend/
│   ├── Code.gs             # Google Apps Script backend
│   └── appsscript.json     # Apps Script manifest (OAuth scopes, runtime config)
├── deployment_checklist.md # Pre-deployment & new machine setup checklist
├── .env.example            # Environment variable template
├── .gitignore              # Excludes config.js, .env, deploy.sh, node_modules
├── package.json            # Local dev server
└── README.md               # This file
```

---

## Project Documentation Map

| File | Role |
|------|------|
| `deployment_checklist.md` | Full reference — new machine setup, secrets, `.htaccess` rules, step-by-step deploy guides |
| `new_conversation.md` | Agent operating rules — what the AI agent does automatically every task block |
| `walkthrough.md` | Architecture memory — how the system works, data flow, lessons learned |
| `implementation_plan.md` | What's done / what's next |

---

## Updating Workshops

Edit the `<select id="workshop">` options in `public/index.html` before launch.

## Updating Event Info

Edit the info cards in the `<aside class="panel panel--secondary">` section of `index.html`.
