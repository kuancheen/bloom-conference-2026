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
- [ ] Confirm repo is public in GitHub settings
- [ ] Review repository for accidental exposure of real IDs in commit history

---

## Priority 2 — Frontend Registration Flow
- [ ] Build a polished landing registration page
- [ ] Add adult registration form with validation
- [ ] Add kids registration form with validation
- [ ] Add dynamic switch between Adult and Kids modes
- [ ] Implement error banners and success states
- [ ] Add support for multiple children in Kids mode
- [ ] Add file upload for payment receipt in Kids mode
- [ ] Add local draft persistence (optional)

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

## Priority 4 — Admin & Dashboard
- [ ] Create dashboard for number of signups
- [ ] Create registrant directory view
- [ ] Add church plant and homes filters
- [ ] Add counts by adults and kids
- [ ] Add timeline chart for registrations over time
- [ ] Add basic export or reporting support

---

## Priority 5 — Security Hardening
- [ ] Ensure no real IDs, URLs, or secrets are committed
- [ ] Add clear deployment documentation for safe setup
- [ ] Add environment variable guidance for local machine use
- [ ] Add warnings against committing live config
- [ ] Add a security checklist for future contributors

---

## Priority 6 — Production Readiness
- [ ] Validate all required fields
- [ ] Validate email format
- [ ] Validate payment upload requirements
- [ ] Test responsive mobile layout
- [ ] Test cross-browser behavior
- [ ] Add accessibility improvements
- [ ] Final QA pass before launch

---

## Immediate Next Actions
1. Make the repo public in GitHub settings.
2. Add architecture documentation (`walkthrough.md`).
3. Add onboarding/context file (`new_conversation.md`).
4. Implement robust frontend validation.
5. Validate the Google Apps Script backend end-to-end.
6. Test registration data flow and Drive receipt upload.
