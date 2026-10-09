# Bloom Conference 2026 — Implementation Plan

This document serves as the active checklist for all remaining features, bug fixes, and deployment steps. 
**Do not mark items as complete until they are fully verified in the environment.**

## Phase 1: Remaining Features & Backend Enhancements
- [x] **Automated Confirmation Email:** 
  - Add `MailApp` or `GmailApp` logic to `backend/Code.gs` to send a trilingual confirmation email upon successful registration.
  - The email must be triggered automatically inside the `doPost` function.
  - Test email delivery to ensure it doesn't get flagged as spam.
- [x] **Workshop Capacity Limits Enforcement (`Limits` Sheet):**
  - Read workshop limits and current registration counts from the `Limits` tab in Google Sheets via `action=config` or a dedicated `limits` helper in `backend/Code.gs`.
  - In `public/app.js`, disable full workshop options in the dropdown dynamically, appending `(FULL / 已满 / Penuh)` to the label.
  - In `backend/Code.gs` `doPost`, implement server-side validation against `Limits` before saving to prevent over-registration if capacity is reached.
  - Update `public/index.html` cache busters upon modification.

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

## Phase 4: Maintenance & Asset Cache Busting
- [x] **Datetime-based Cache Busting:**
  - Enforce `YYYYMMDDHHMMSS` timestamp query strings on all CSS and JS asset links in `index.html` on every modification (without `v=`).
  - Ensures immediate client refresh on WordPress/Apache reverse proxy setups.

## Phase 5: Sign Up Dashboard & Registrants List (Upcoming)
- [ ] **Google Apps Script Backend Endpoints (`backend/Code.gs`):**
  - Implement `action=stats` / dashboard data calculation (total registered, breakdown by church plant, workshop occupancy, payment status, etc.).
  - Implement `action=registrants` or secure data retrieval endpoint with pagination, search, and filter options.
  - Implement verification / admin status toggles (e.g. marking payment as verified).
  - Reference implementation: [acts-church-conference-2026/Code.gs](https://github.com/kuancheen/acts-church-conference-2026/blob/main/Code.gs)
- [ ] **Sign Up Dashboard (`public/dashboard.html`):**
  - Build real-time metrics dashboard (KPI cards, charts, church plant distribution, workshop capacities).
  - Reference design & structure: [acts-church-conference-2026/dashboard.html](https://github.com/kuancheen/acts-church-conference-2026/blob/main/dashboard.html)
  - Style to match the Bloom 2026 floral / terracotta design system (`#D03A19`, `#F8755D`, `#FDF6F0`).
- [ ] **Registrants List Portal (`public/registrants.html`):**
  - Build searchable, filterable registrants table with quick status updates, receipt image preview modals, and export capabilities.
  - Reference design & structure: [acts-church-conference-2026/registrants.html](https://github.com/kuancheen/acts-church-conference-2026/blob/main/registrants.html)
  - Style to match Bloom 2026 design system.
- [ ] **Apache Routing & Cache Busting:**
  - Ensure `.htaccess` routes `/dashboard` and `/registrants` properly.
  - Include datetime cache busters on all linked scripts and stylesheets.
