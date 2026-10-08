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

### 3. WordPress Deployment

Upload the `public/` folder contents to your WordPress server:

**Option A — Standalone page at a subdirectory:**
- Upload to `/wp-content/uploads/bloom-2026/` (or a custom directory outside WP content)
- Point a page with a redirect, or embed via iframe/shortcode

**Option B — WordPress Page Template (recommended):**
- Copy `index.html` content into a custom page template
- Enqueue `styles.css` and `app.js` via `functions.php`
- Add `config.js` to the same directory as the enqueued scripts

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
│   ├── styles.css          # Soft floral design system
│   ├── app.js              # Form logic, validation, submission
│   └── config.js.example   # Template — copy to config.js and fill in URL
├── backend/
│   ├── Code.gs             # Google Apps Script backend
│   └── README.md           # Backend-specific setup instructions
├── .env.example            # Environment variable template
├── .gitignore              # Excludes config.js, .env, node_modules
├── package.json            # Local dev server
└── README.md               # This file
```

---

## Updating Workshops

Edit the `<select id="workshop">` options in `public/index.html` before launch.

## Updating Event Info

Edit the info cards in the `<aside class="panel panel--secondary">` section of `index.html`.
