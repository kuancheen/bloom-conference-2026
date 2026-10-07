# Bloom Conference 2026 — Project Walkthrough

## Overview
This project is a public-safe multi-file registration starter for a conference. It uses:
- a static frontend served from `public/`
- a Google Apps Script backend bound to a Google Sheet
- optional receipt uploads to Google Drive
- a configuration layer that avoids committing live secrets

The goal is to keep the repository safe to share publicly while still functioning as a practical registration system.

---

## Architecture at a Glance

**Frontend:**
- `public/index.html` — page structure and form layout
- `public/styles.css` — styling for the registration UI
- `public/app.js` — mode switching, form validation, payload preparation, fetch submission
- `public/config.js.example` — sample configuration file
- `public/config.js` — actual runtime config created by the developer; should not be committed

**Backend:**
- `backend/Code.gs` — Apps Script code that receives POST requests and writes to Google Sheets
- `backend/README.md` — setup guide for wiring the script to Google Sheets and Drive

**Support:**
- `.env.example` — example local environment variables
- `.gitignore` — hides `.env`, `node_modules`, and local runtime secrets
- `package.json` — local dev script using `npx serve public`

---

## Data Flow

1. User opens `public/index.html`
2. The browser loads `public/app.js`
3. The form switches between Adult and Kids mode
4. On submit, the frontend prepares a JSON payload
5. The payload is sent with `fetch()` to the Google Apps Script `/exec` URL
6. Apps Script parses the payload and writes rows to a Google Sheet
7. If a receipt file is present, the backend uploads it to a Drive folder
8. The backend returns a success/error response
9. The frontend displays the status box

Example payload flow:
```js
{
  registrationType: "Adult 13+",
  fullName: "Jane Doe",
  phoneNumber: "+60123456789",
  emailAddress: "jane@example.com",
  churchPlant: "Bloom City",
  homesCode: "BC-H01",
  remarks: "Optional note"
}
```

---

## Repository Structure

```text
bloom-conference-2026/
├── .gitignore
├── .env.example
├── README.md
├── package.json
├── implementation_plan.md
├── walkthrough.md
├── new_conversation.md
├── public/
│   ├── app.js
│   ├── config.js.example
│   ├── index.html
│   ├── styles.css
│   └── config.js   (local file, not meant for public commit)
├── backend/
│   ├── Code.gs
│   └── README.md
└── .github/        (optional future directory)
```

---

## Current Implementation Notes

### Frontend
The frontend currently includes:
- adult/kids registration mode switching
- basic form layout
- placeholder status messaging
- payload assembly for submission
- fetch logic to a Google Apps Script deployment URL

### Backend
The backend template includes:
- a `doPost(e)` handler
- automatic creation of `Adults` and `Kids` sheets
- adult and child registration row writes
- optional Drive file upload for receipts
- placeholder `DRIVE_FOLDER_ID` to be replaced before deployment

---

## Security Model
This project intentionally follows a safe public repo model:
- no hardcoded spreadsheet IDs
- no hardcoded Drive folder IDs
- no live Apps Script deployment URLs committed to the repo
- config values are expected to live locally or in deployment environment variables

Critical rule:
- If a real Google ID or script URL is ever added, remove it before pushing to a public repo.

---

## Local Development
Run the project locally with:
```bash
npm install
npm run dev
```

This serves the `public/` directory with a lightweight static server.

---

## Deployment Notes
The frontend needs a live configuration value:
- `public/config.js` must be created from `public/config.js.example`
- the Google Apps Script deployment URL must be added there

The backend needs:
- a real Google Drive folder ID
- a Google Sheet bound to the Apps Script project
- deployment as a web app

---

## Known Risks / Follow-up Work
- Need end-to-end test of Apps Script connectivity
- Need validation and UX improvements
- Need exact admin dashboard logic
- Need final production styling and QA
- Need careful audit of all commit history before final public release

---

## Summary
This repo is intended to be a clean, public-safe starter for a conference registration system. The architecture is intentionally simple: a static frontend plus a Google Apps Script backend. The system can be extended into a larger dashboard or admin app without exposing sensitive config values in source control.
