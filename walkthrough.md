# Bloom Conference 2026 — System Walkthrough

This document serves as the project's living memory, detailing the system architecture, active file structures, completed features, and technical lessons learned.

## 1. Project Objective
Build a secure, ladies-only, trilingual (English, 中文, Bahasa Malaysia) conference registration form for Bloom 2026. The system must save attendee data to Google Sheets, upload payment proofs to Google Drive, and operate on an existing WordPress/Apache web server under a clean `/register` URL. Crucially, the repository must remain secure, exposing zero API endpoints, Drive IDs, or configuration secrets in the git history.

## 2. System Architecture
*   **Frontend:** Vanilla HTML5, CSS3, and JavaScript. No heavy frontend frameworks to ensure fast loading and easy deployment.
*   **Backend:** Google Apps Script (REST API).
*   **Database & Storage:** Google Sheets for structured registration data, Google Drive for receipt storage.
*   **Hosting:** Hosted as a standalone HTML directory (`/bloom2026/`) on an Apache server.
*   **Routing:** Apache `.htaccess` `mod_rewrite` is used to mask the directory and serve it cleanly at `actschurchconference.com/register`.

## 3. Active File Structure
```text
bloom-conference-2026/
├── public/
│   ├── index.html          # Main registration form (Trilingual UI)
│   ├── dashboard.html      # Sign up metrics & analytics dashboard
│   ├── dashboard.js        # Dashboard data fetching and chart rendering
│   ├── registrants.html    # Attendees directory table (Name, Church Plant, Homes Code)
│   ├── registrants.js      # Registrants table search, filtering, and rendering
│   ├── styles.css          # Design system (Soft floral palette, responsive layout, portal UI)
│   ├── app.js              # Registration form logic (Validation, Base64 conversion, Fetch API)
│   ├── acts-logo.png       # Acts Church branding logo
│   └── config.js.example   # Template for production config
├── backend/
│   ├── Code.gs             # Google Apps Script backend logic (config, stats, registrants, doPost)
│   └── appsscript.json     # Apps Script manifest (OAuth scopes, runtime config)
├── README.md               # Quickstart and deployment instructions
├── implementation_plan.md  # Active checklist of remaining tasks
└── walkthrough.md          # System architecture and living memory (This file)
```
*(Note: `.env`, `public/config.js`, and `node_modules` are excluded via `.gitignore`)*

## 4. Completed Features
*   **Trilingual UI & Layout:** Form fields, labels, error messages, success screens, section headers, upload prompts, and the submit button are all fully localized in EN, ZH, and BM. Event info and banking details are positioned prominently on the left panel (top on mobile) for optimal attendee onboarding.
*   **Terracotta & Coral Design System:** Palette mapped with primary Terracotta Red (`#D03A19` → `#AD2A0E`), soft Coral/Peach tints (`#F8755D` / `#FDEEEA`), deep plum typography (`#3C2B35`), and cream backgrounds (`#FDF6F0`).
*   **Sign Up Metrics Dashboard (`public/dashboard.html`):** Real-time analytics dashboard presenting KPI summary cards (Total Registered, Top Church Plant, Workshop Occupancy Rate, First-Time Attendees), an interactive Chart.js line graph for daily signup volume timeline, workshop capacity progress bars, church plant breakdown, and demographic distributions. Includes unified portal header navigation and Acts logo branding.
*   **Registrants Directory (`public/registrants.html`):** Lightweight attendee directory displaying 3 core fields: Full Name, Church Plant, and Homes Code. Features instant client-side text search by Name and multi-select dropdown filters for Church Plant and Homes Code.
*   **Dynamic Dropdown Config:** Dropdown options (Age Range, Marital Status, Church Plant with optgroups, Workshop) are loaded at runtime via `GET {scriptUrl}?action=config` from the Google Sheet's "Config" tab. The Config sheet layout is structured horizontally: Col B/C (Age Range), Col E/F (Marital Status), Col H/I (Workshop), Col K/L (First Bloom), Col M/N/O (Church Plant with Grouping). Static placeholder options remain in the HTML as a skeleton.
*   **Dynamic Form Logic:** Includes conditional rendering (e.g., "Others" text field appears when "Others" is selected in the Church Plant dropdown).
*   **File Upload System:** Custom drag-and-drop zone that accepts JPG, PNG, and PDF (max 5MB). Files are converted to Base64 strings client-side to bypass Google Apps Script CORS limitations with standard multipart forms.
*   **Secure Configuration Architecture:** The Google Apps Script URL is loaded from an external, gitignored `config.js` file, ensuring the GitHub repo contains no live endpoints.
*   **Google Drive Integration:** The backend decodes the Base64 payload and saves it to a specified Drive folder. The file name is auto-generated using the registrant's name and a UUID (e.g., `Bloom2026_Payment_Jane_Doe_abc123.jpg`), and its permission is automatically set to `VIEW` for shareable access.
*   **Google Sheets Integration:** Automatically generates the "Registration" sheet with formatted headers on the first run. Column schema: Col A=Timestamp, Col B=Email, Col C=Full Name, Col D=Phone, Col E=Age Range, Col F=Marital Status, Col G=Church Plant, Col H=Others, Col I=Homes Code, Col J=Workshop, Col K=First Bloom?, Col L=Payment URL, Col M=Remarks, Col N=Submission ID, Col O=Payment Verified / Admin Notes, Col P=Email Sent Timestamp, Col Q=Email Error Note.
*   **Automated Confirmation Email:** Trilingual HTML email powered by `MailApp` (not `GmailApp`), styled with Canva CDN banner header and Terracotta/Coral accents to match frontend UI. Includes a pending payment verification notice and a clickable link to view the uploaded payment proof receipt in Google Drive. Tracks dispatch timestamp (Col P) and errors (Col Q) in the sheet. Sender name: "🌸 Bloom Conference 2026". Subject: "Registration Received - Bloom Conference 2026".
*   **Workshop Capacity Limits Enforcement:** Workshop capacity and current counts are queried dynamically from the `Limits` tab in Google Sheets via `GET ?action=config`. If a workshop reaches or exceeds its set limit (or status is marked closed/full), the client dropdown disables the `<option>` tag and appends a trilingual label `(FULL / 已满 / Penuh)`. Server-side validation in `backend/Code.gs` `doPost` checks capacity against `Limits` prior to processing payment proofs or appending rows, rejecting over-capacity submissions with dynamic trilingual error notices specifying the exact full workshop name.
*   **Asset Routing Resilience:** The frontend uses relative paths, but the Apache `.htaccess` is configured to intercept asset requests made from `/register`, `/dashboard`, and `/registrants` vanity URLs and securely route them to the `/bloom2026/` directory.
*   **Datetime-Based Cache Busting:** All CSS (`styles.css`) and JavaScript (`config.js`, `app.js`, `dashboard.js`, `registrants.js`) tags include query parameters with a second-accurate datetime string (`YYYYMMDDHHMMSS` without `v=`) to bypass browser and reverse-proxy caches immediately on deployment.

## 5. Environment & Setup Details
*   **Local Development:** `npm run dev` uses the `serve` package to host the `public/` directory locally. A local dummy `config.js` is required to prevent errors.
*   **Production:** Files in `public/` are uploaded to the web server. The Apps Script is deployed natively in the Google Workspace environment as a Web App executing as the script owner.
*   **OAuth Scopes (`backend/appsscript.json`):** The `appsscript.json` manifest is committed to the repository and must be present in the Apps Script editor (View → Show manifest file). Required scopes:
    - `auth/gmail.send` — allows `GmailApp.sendEmail()` to dispatch confirmation emails.
    - `auth/spreadsheets` — allows read/write access to the registration Google Sheet.
    - `auth/script.send_mail` — legacy send-mail scope required alongside the Gmail scope.
    - `auth/script.external_request` — allows the script to make outbound HTTP calls.

## 6. Lessons Learned & Technical Decisions
*   **Securing Git History:** Committing sensitive IDs (like the Drive Folder ID) into `Code.gs` leaves traces in the git history. We learned to strip these immediately using `git commit --amend` and force pushing to maintain security. Future IDs should only exist in the live Google Script editor.
*   **Asset Routing with Mod_Rewrite:** When mapping a URL like `/register` to `/bloom2026/index.html` via `.htaccess`, relative links in the HTML (like `href="styles.css"`) will break because the browser resolves them against `/register`. To keep the HTML portable, we decided to handle this at the server level by adding an `.htaccess` rule that explicitly intercepts `styles.css` and `app.js` and routes them to the correct directory.
*   **Google Drive Permissions:** To allow organizers to see receipts without giving them edit access, the Apps Script must execute as the owner (granting it write access) but explicitly set the resulting file's sharing permission to `DriveApp.Permission.VIEW`.
*   **Base64 over Multipart:** Standard `multipart/form-data` submissions often trigger CORS preflight failures when interacting with Google Apps Script Web Apps. Fetching the file via `FileReader`, converting it to a Base64 string, and submitting it as a standard JSON payload is much more reliable.
*   **Email Error Handling & Sheet Operations:** The confirmation email dispatch is wrapped in a `try...catch` block. This ensures that if the email fails (e.g., due to Google Workspace quotas), the registration data is still safely saved to the Google Sheet. The success timestamp or the error message is recorded in dedicated sheet columns (Columns P and Q) alongside the registration data in a single `appendRow` call to optimize script execution time and prevent partial data loss.
*   **Asset Cache Busting with Seconds Precision:** Web proxies (Cloudflare, Apache, WordPress caching) often retain older revisions of `.css` and `.js` files. Appending a timestamp accurate to seconds (e.g. `?20261009113350`) directly to `<link>` and `<script>` paths without `v=` guarantees fresh asset fetches across all devices on deployment.
*   **Apps Script Deployment Versioning:** Editing Apps Script code in the browser does not update the live `/exec` endpoint. Always update the existing deployment via **Manage Deployments → Edit (pencil) → New Version → Deploy** so the Web App URL remains static and immediately runs the latest script revision.
*   **CORS Preflight Bypass via `text/plain`:** Google Apps Script Web Apps do not handle HTTP `OPTIONS` preflight requests. Sending `POST` requests from the browser with `Content-Type: application/json` triggers a CORS preflight that results in a browser-level `TypeError: Failed to fetch`. Setting `Content-Type: text/plain;charset=utf-8` classifies the POST as a "Simple Request", completely bypassing the CORS preflight while Google Apps Script parses `e.postData.contents` as standard JSON.
*   **Concurrent Traffic & Load Resilience:** Stress testing the live Google Apps Script endpoint (`GET ?action=config`) across bursts of 5, 15, and 30 simultaneous users confirmed a 100% success rate (50/50 requests) with zero dropped connections or server crashes. Average response latencies remained stable at 2.8s–3.6s, with `public/app.js` managing asynchronous population to ensure immediate frontend rendering and resilient error-fallback handling.
*   **Apache Rewrite Loop Prevention:** When routing sub-directory assets or vanity URLs (e.g., `/dashboard`, `/registrants`) via Apache `mod_rewrite`, always precede asset rewrite rules with `RewriteCond %{REQUEST_URI} !^/bloom2026/` and explicit `RewriteBase /`. This prevents Apache sub-request cycles from endlessly re-matching asset queries and triggering `HTTP 500 Internal Server Error`.
