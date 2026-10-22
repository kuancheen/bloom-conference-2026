# Bloom Conference 2026 — Pre-Deployment & Deployment Checklist

This document is an operational guide and checklist for any engineer or Antigravity agent setting up or deploying the Bloom Conference 2026 application from a new workstation.

---

## 1. Environment & Secrets Setup (First Run on New Machine)

Because all credentials, endpoints, and secrets are strictly excluded from git, the new machine will start with missing runtime configs. Complete this checklist before running local dev or initiating deployments:

- [ ] **1. Create `public/config.js`:**
  - Copy `public/config.js.example` to `public/config.js`.
  - Fill in the production `googleScriptUrl` (`https://script.google.com/macros/s/.../exec`).
  - Fill in the production `googleClientId` (`...apps.googleusercontent.com`).
  - *Verify*: Ensure `public/config.js` remains gitignored (`git status` must not show it).

- [ ] **2. Create `.env` (for local automation / deployment scripts):**
  - Copy `.env.example` to `.env`.
  - Fill in `GOOGLE_SCRIPT_URL`, `DRIVE_FOLDER_ID`, and SFTP connection credentials (`SFTP_USER`, `SFTP_HOST`, `SFTP_PASS`, `SFTP_REMOTE_BLOOM_DIR`).
  - *Verify*: Ensure `.env` remains gitignored.

- [ ] **3. Install Local Dependencies:**
  ```bash
  npm install
  ```
  - Verify local dev server runs:
  ```bash
  npm run dev
  ```

---

## 2. Pre-Deployment Verification Checklist

Before pushing any changes to production, verify each of the following:

- [ ] **A. Datetime Cache Busting Rule (`YYYYMMDDHHMMSS`):**
  - If any changes were made to `styles.css`, `app.js`, `dashboard.js`, `registrants.js`, `verify-payments.js`, or `config.js`, you **MUST** update the query string on every `<link>` and `<script>` tag referencing those files across:
    - `public/index.html`
    - `public/dashboard.html`
    - `public/registrants.html`
    - `public/verify-payments.html`
  - Format: `YYYYMMDDHHMMSS` (e.g., `styles.css?20261022113000`). **Do not use `?v=` or generic numbers**.

- [ ] **B. No Hardcoded Secrets in Tracked Files:**
  - Verify `backend/Code.gs` contains `YOUR_DRIVE_FOLDER_ID` placeholder (never real folder IDs).
  - Verify `git diff` shows no secrets in any committed file.

- [ ] **C. Trilingual Consistency (if modifying Form UI):**
  - Ensure labels, errors, and modal messages have all 3 languages: English, 中文, and Bahasa Malaysia.

---

## 3. Production Deployment Guide

### A. Frontend Deployment (Web Server / Apache)

- [ ] **Deployable Assets in `public/`:**
  - `index.html` (Registration Form)
  - `dashboard.html` & `dashboard.js` (Metrics & Analytics Dashboard)
  - `registrants.html` & `registrants.js` (Attendee Directory)
  - `verify-payments.html` & `verify-payments.js` (Payment Reviewer Portal)
  - `styles.css` (Design System & Portal Styles)
  - `app.js` (Form Submission Logic)
  - `config.js` (Production API Endpoint & Google OAuth Client ID)
  - `acts-logo.png` & `registration-form-banner.png` (Visual Assets)

- [ ] **Target Directory on Server:**
  - Remote Directory: `/srv/users/actschurchconference-admin/apps/actschurchconference/public/bloom2026/`
  - Upload updated files via SFTP/SSH.

- [ ] **Apache `.htaccess` Rewrites (Root Directory):**
  - Ensure the Apache `.htaccess` in `/srv/users/actschurchconference-admin/apps/actschurchconference/public/.htaccess` includes the rules before `# BEGIN WordPress`:
  ```apache
  <IfModule mod_rewrite.c>
  RewriteEngine On

  # 1. Page Routes
  RewriteRule ^register/?$ /bloom2026/index.html [L,QSA]
  RewriteRule ^dashboard/?$ /bloom2026/dashboard.html [L,QSA]
  RewriteRule ^registrants/?$ /bloom2026/registrants.html [L,QSA]
  RewriteRule ^verify-payments/?$ /bloom2026/verify-payments.html [L,QSA]

  # 2. Asset Routes (Intercept CSS, JS, and Image requests from vanity URLs)
  RewriteCond %{REQUEST_URI} !^/bloom2026/
  RewriteRule ^(?:register/|dashboard/|registrants/|verify-payments/)?(styles\.css|app\.js|dashboard\.js|registrants\.js|verify-payments\.js|config\.js|acts-logo\.png|registration-form-banner\.png)$ /bloom2026/$1 [L,QSA]
  </IfModule>
  ```

### B. Backend Deployment (Google Apps Script)

Whenever `backend/Code.gs` or `backend/appsscript.json` is modified:

- [ ] **1. Open Google Sheet → Extensions → Apps Script.**
- [ ] **2. Copy code from `backend/Code.gs` into the script editor.**
- [ ] **3. In Apps Script editor, verify the live `DRIVE_FOLDER_ID` is present.**
- [ ] **4. Create a New Version Deployment:**
  - Click **Deploy** → **Manage Deployments**.
  - Select the active Web App deployment and click the **Pencil (Edit)** icon.
  - Set Version to **New Version**.
  - Click **Deploy**.
  - *(Crucial: Merely saving the code in Apps Script does NOT update the live `/exec` endpoint. You must deploy a New Version).*

---

## 4. Post-Deployment Smoke Test Checklist

After deployment, test the live URLs:

- [ ] **Registration Form (`actschurchconference.com/register`):**
  - Verify page loads with current stylesheet and assets.
  - Check dropdown options load dynamically from Google Sheet `Config` tab.
  - Verify workshop capacity badges load correctly.
- [ ] **Signups Dashboard (`actschurchconference.com/dashboard`):**
  - Verify KPI cards, Timeline chart, and Workshop occupancy render with live data.
- [ ] **Registrants List (`actschurchconference.com/registrants`):**
  - Verify attendee table renders with Name, Church Plant, and Homes Code. Test search and filters.
- [ ] **Payment Verification Portal (`actschurchconference.com/verify-payments`):**
  - Verify Google Sign-In prompt works and correctly authorizes whitelisted admins from the `Admins` sheet tab.
