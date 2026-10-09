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
│   ├── styles.css          # Design system (Soft floral palette, responsive layout)
│   ├── app.js              # Client logic (Validation, Base64 conversion, Fetch API)
│   └── config.js.example   # Template for production config
├── backend/
│   ├── Code.gs             # Google Apps Script backend logic
│   └── appsscript.json     # Apps Script manifest (OAuth scopes, runtime config)
├── README.md               # Quickstart and deployment instructions
├── implementation_plan.md  # Active checklist of remaining tasks
└── walkthrough.md          # System architecture and living memory (This file)
```
*(Note: `.env`, `public/config.js`, and `node_modules` are excluded via `.gitignore`)*

## 4. Completed Features
*   **Trilingual UI:** Form fields, labels, error messages, and success screens are fully localized in EN, ZH, and BM.
*   **Dynamic Form Logic:** Includes conditional rendering (e.g., "Others" text field appears when "Others" is selected in the Church Plant dropdown).
*   **File Upload System:** Custom drag-and-drop zone that accepts JPG, PNG, and PDF (max 5MB). Files are converted to Base64 strings client-side to bypass Google Apps Script CORS limitations with standard multipart forms.
*   **Secure Configuration Architecture:** The Google Apps Script URL is loaded from an external, gitignored `config.js` file, ensuring the GitHub repo contains no live endpoints.
*   **Google Drive Integration:** The backend decodes the Base64 payload and saves it to a specified Drive folder. The file name is auto-generated using the registrant's name and a UUID (e.g., `Bloom2026_Payment_Jane_Doe_abc123.jpg`), and its permission is automatically set to `VIEW` for shareable access.
*   **Google Sheets Integration:** Automatically generates the "Registration" sheet with formatted headers on the first run, and correctly handles separate column logic (e.g., mapping the "Others" church plant selection to its own dedicated column).
*   **Automated Confirmation Email:** Trilingual HTML email powered by `GmailApp`, styled to match the frontend UI. Includes a notice that registration is pending payment verification. Tracks success timestamps and dispatch errors directly in the spreadsheet.
*   **Asset Routing Resilience:** The frontend uses relative paths, but the Apache `.htaccess` is configured to intercept asset requests made from the `/register` vanity URL and securely route them to the `/bloom2026/` directory.

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
