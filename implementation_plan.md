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

## Phase 4: Maintenance & UI Polish
- [x] **Datetime-based Cache Busting:**
  - Enforce `YYYYMMDDHHMMSS` timestamp query strings on all CSS and JS asset links in `index.html` on every modification (without `v=`).
  - Ensures immediate client refresh on WordPress/Apache reverse proxy setups.
- [x] **Click-to-Copy Banking Transfer Info:**
  - Provide one-click/touch copy-to-clipboard functionality for Account Number (`3116737405`) and Reference (`BLOOM26`) with visual badges (`📋 Copy` → `✅ Copied!`).

## Phase 5: Sign Up Dashboard & Registrants List
- [x] **Google Apps Script Backend Endpoints (`backend/Code.gs`):**
  - Implement `action=stats`: Total registered, breakdown by church plant, workshop occupancy from `Limits` & `Registration` tabs, age range, marital status, first bloom %, and timeline by date (`dailySignups`).
  - Implement `action=registrants`: Retrieve registration records returning Full Name, Church Plant (with Others merged), and Homes Code.
- [x] **Sign Up Dashboard (`public/dashboard.html` & `public/dashboard.js`):**
  - Build dashboard with Acts logo branding (`Bloom '26 Acts Women's Conference`), navigation link to Registrants list on top right.
  - KPI Cards: Total Registered Attendees, Top Church Plants, Workshop Occupancy Rate, First-Time Attendees.
  - Signups Timeline by Date chart/graph (interactive daily trend visualization).
  - Workshop capacity progress bars and Church Plant distribution breakdown.
  - Demographic distribution (Age groups & Marital status).
  - Match Bloom 2026 terracotta design system (`#D03A19`, `#F8755D`, `#FDF6F0`).
- [x] **Registrants List Portal (`public/registrants.html` & `public/registrants.js`):**
  - Build attendee list with Acts logo branding, navigation link to Dashboard on top right.
  - Search: Global text search by Full Name.
  - Filters: Dropdown filters for Church Plant and Homes Code.
  - Table: Display 3 core columns: **Full Name**, **Church Plant**, and **Homes Code**.
  - Match Bloom 2026 terracotta design system.
- [x] **Apache Routing & Cache Busting:**
  - Configure `.htaccess` rewrite rules for `/dashboard` and `/registrants`.
  - Add datetime query strings (`YYYYMMDDHHMMSS`) to all asset links.
