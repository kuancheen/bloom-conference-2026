# Bloom Conference 2026

This project is a clean multi-file starter for a conference registration experience. The public repository intentionally avoids committing any secret Google IDs, Drive folder IDs, or live Apps Script deployment URLs.

## Project layout

- `public/` — frontend files for the registration page and styling
- `backend/` — Google Apps Script backend template that writes registrations to a spreadsheet
- `README.md` — project overview and setup notes
- `.env.example` — example environment values for local setup
- `package.json` — lightweight local serving scripts

## Setup

1. Copy `public/config.js.example` to `public/config.js`.
2. Update the Google Apps Script deployment URL in `public/config.js`.
3. Update the Google Drive folder ID in `backend/Code.gs` before deploying the backend.
4. Deploy the Apps Script as a web app and use the generated `/exec` URL.
5. Run locally:

```bash
npm install
npm run dev
```

## Important security notes

- Never commit real spreadsheet IDs or deployment URLs.
- Keep configuration values in local files or environment variables.
- Rotate deployment URLs if they were previously shared in public files.
