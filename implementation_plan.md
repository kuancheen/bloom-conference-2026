> **NOTE:** This document represents the initial phase built with GitHub Copilot and is now **ARCHIVED/OUTDATED**. The project was completely rebuilt and finalized using Google Antigravity. Please refer to `README.md` for the current, accurate documentation (including the `.htaccess` deployment routing).

> **NOTE:** This document represents the initial phase built with GitHub Copilot and is now **ARCHIVED/OUTDATED**. The project was completely rebuilt and finalized using Google Antigravity. Please refer to `README.md` for the current, accurate documentation (including the  deployment routing).

# Bloom Conference 2026 — Implementation Plan

## Mission
Build a secure, multi-file conference registration system with:
- a static frontend
- a Google Apps Script backend
- public-safe configuration
- no secret IDs or deployment URLs committed to the repository

---

## Current Status
This repo is a starter project for a public-safe registration app. The initial scaffold is in place, but the following must still be completed before the app is production-ready.

---

## Priority 1 — Foundation & Safety
- [x] Create GitHub repository for the project
- [x] Create project skeleton and folder structure
- [x] Add `.gitignore` to exclude `.env`, `node_modules`, and local config
- [x] Add `public/config.js.example` as a safe config template
- [x] Add `.env.example` for non-sensitive local configuration
- [x] Add `backend/Code.gs` as a secure backend template
- [x] Add `README.md` with setup instructions
- [x] Keep deployment URLs and sheet IDs out of source control
- [x] Add `implementation_plan.md`, `walkthrough.md`, `new_conversation.md`
- [ ] Confirm repo is public in GitHub settings
- [ ] Review repository for accidental exposure of real IDs in commit history

---

## Priority 2 — Frontend Registration Flow & Validation
- [x] Build a polished landing registration page
- [x] Add adult registration form layout
- [x] Add kids registration form layout
- [x] Add dynamic switch between Adult and Kids modes
- [ ] **Add production-ready validation** (email format, required fields, phone format)
- [ ] **Add real-time validation feedback on blur/change**
- [ ] **Add field-level error states with styled messages**
- [ ] **Implement form state preservation across mode switches**
- [ ] Implement error banners and success states
- [ ] Add support for multiple children in Kids mode
- [ ] Add file upload for payment receipt in Kids mode
- [ ] Add local draft persistence (localStorage)

---

## Priority 3 — Backend Integration
- [ ] Create real Google Sheet for adult registrations
- [ ] Create real Google Sheet for kids registrations
- [ ] Configure Apps Script deployment URL in frontend
- [ ] Configure Drive folder ID in backend
- [ ] Test adult POST submission end-to-end
- [ ] Test kids POST submission end-to-end
- [ ] Verify receipt file upload works
- [ ] Confirm data lands in correct columns and rows

---

## Priority 4 — Admin Dashboard & Analytics
- [ ] **Create admin index page (`admin/index.html`)**
- [ ] **Add dashboard statistics (total, adults, kids counts)**
- [ ] **Build registration timeline chart**
- [ ] **Add church plant distribution view**
- [ ] **Add registrant directory with filtering**
- [ ] **Add search by name, email, homes code**
- [ ] **Create real-time data refresh from Google Sheets**
- [ ] Add export registrations to CSV
- [ ] Add registration status indicators (pending, confirmed, etc.)

---

## Priority 5 — Security Hardening
- [ ] Ensure no real IDs, URLs, or secrets are committed
- [ ] Add clear deployment documentation for safe setup
- [ ] Add environment variable guidance for local machine use
- [ ] Add warnings against committing live config
- [ ] Add a security checklist for future contributors

---

## Priority 6 — Production Readiness
- [x] Validate all required fields
- [x] Validate email format
- [ ] Validate payment upload requirements
- [ ] Test responsive mobile layout
- [ ] Test cross-browser behavior
- [ ] Add accessibility improvements
- [ ] Final QA pass before launch

---

## Priority 7 — Deployment & Documentation
- [ ] GitHub Pages deployment guide
- [ ] Google Apps Script deployment guide
- [ ] Local development setup guide
- [ ] Production environment setup guide

---

## Immediate Next Actions
1. **Implement production-ready frontend validation** with real-time feedback.
2. **Create admin dashboard starter** with data visualization.
3. Make the repo public in GitHub settings.
4. Validate the Google Apps Script backend end-to-end.
5. Test registration data flow and Drive receipt upload.
6. Create deployment guides for GitHub Pages and Apps Script.
