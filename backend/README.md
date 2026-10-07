# Bloom Conference 2026 backend notes

This directory contains a Google Apps Script backend template designed to be copied into a new Apps Script project.

## Setup

1. Open Google Sheets.
2. Go to Extensions → Apps Script.
3. Paste the contents of `Code.gs` into the Apps Script editor.
4. Set the `DRIVE_FOLDER_ID` to a real Google Drive folder ID.
5. Deploy the script as a web app.
6. Copy the generated `/exec` URL into `public/config.js`.

## Notes

- The backend stores adult registrations in an `Adults` sheet.
- The backend stores kids registrations in a `Kids` sheet.
- Receipt uploads are saved to the configured Drive folder.
