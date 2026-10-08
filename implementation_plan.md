# Bloom Conference 2026 — Implementation Plan

This document serves as the active checklist for all remaining features, bug fixes, and deployment steps. 
**Do not mark items as complete until they are fully verified in the environment.**

## Phase 1: Remaining Features & Backend Enhancements
- [x] **Automated Confirmation Email:** 
  - Add `MailApp` or `GmailApp` logic to `backend/Code.gs` to send a trilingual confirmation email upon successful registration.
  - The email must be triggered automatically inside the `doPost` function.
  - Test email delivery to ensure it doesn't get flagged as spam.

## Phase 2: Production Setup & Deployment
- [x] **Google Workspace Initialization:**
  - Create the live Google Sheet for "Registration".
  - Link the Apps Script (`Code.gs`) to the live sheet.
  - Insert the live `DRIVE_FOLDER_ID` into the Apps Script code.
- [x] **Apps Script Deployment:**
  - Deploy the Apps Script as a Web App (Execute as: Me, Access: Anyone).
  - Obtain the live `/exec` URL.
- [x] **Web Server (Apache/WordPress) Configuration:**
  - Upload the `public/` directory to the server under `/bloom2026/`.
  - Create the live `config.js` on the server using the `/exec` URL.
  - Add the custom `RewriteRule` directives to the server's `.htaccess` file (above the WordPress block) to route `/register` and intercept CSS/JS assets.

## Phase 3: End-to-End Testing
- [x] **Live Testing:**
  - Submit a test registration at the live `/register` URL.
  - Verify the file uploads correctly to the designated Google Drive folder.
  - Verify the data populates the Google Sheet (including the separate "Others" column).
  - Verify the confirmation email arrives in the inbox (check spam/promotions).
  - Verify UI elements (validation, dropdowns, success screen) render correctly on mobile and desktop.
