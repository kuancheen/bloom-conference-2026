# Bloom Conference 2026 — Implementation Plan

## Project Scope
A secure, multi-file conference registration system with a static frontend and Google Apps Script backend. No secrets committed to source control. Public repository ready for sharing and forking.

---

## Phase 1: Core Scaffolding & Architecture ✅

- [x] Create private GitHub repository `kuancheen/bloom-conference-2026`
- [x] Initialize `.gitignore` (exclude `.env`, `node_modules/`, `public/config.js`)
- [x] Create multi-file frontend structure (`public/index.html`, `styles.css`, `app.js`)
- [x] Implement registration form with Adult and Kids modes
- [x] Create Google Apps Script backend template (`backend/Code.gs`)
- [x] Set up package.json with dev script (`npm run dev`)
- [x] Create `.env.example` and `public/config.js.example` for safe sharing

---

## Phase 2: Repository Visibility & Documentation (IN PROGRESS)

- [ ] Make repository public
- [ ] Create `implementation_plan.md` (this file)
- [ ] Create `walkthrough.md` (system architecture & file structure)
- [ ] Create `new_conversation.md` (agent onboarding guide)

---

## Phase 3: Frontend Enhancement

- [ ] Add client-side form validation (email format, required fields)
- [ ] Implement dynamic error state UI
- [ ] Add success screen after registration submission
- [ ] Support multiple children in Kids mode
- [ ] Add file upload for payment receipt (Kids mode)
- [ ] Implement auto-save to localStorage for draft preservation

---

## Phase 4: Backend Enhancement

- [ ] Test Apps Script backend deployment workflow
- [ ] Implement spreadsheet auto-formatting for Adults sheet
- [ ] Implement spreadsheet auto-formatting for Kids sheet
- [ ] Add UUID tracking for multi-child registrations
- [ ] Implement error handling and logging in backend
- [ ] Set up receipt file uploading to Google Drive

---

## Phase 5: Admin & Analytics (Future)

- [ ] Create admin dashboard (`admin/dashboard.html`)
- [ ] Implement registration statistics view
- [ ] Add filtering by church plant, homes code, registration type
- [ ] Export registrations to CSV
- [ ] Create real-time sync indicators

---

## Phase 6: Deployment & Testing

- [ ] Set up GitHub Pages for frontend hosting
- [ ] Create deployment guide for Apps Script
- [ ] Write UAT test plan
- [ ] Test form submission end-to-end
- [ ] Test receipt upload workflow
- [ ] Verify error handling and fallback states

---

## Phase 7: Security & Hardening

- [ ] Audit for exposed secrets in git history
- [ ] Add CORS headers to Apps Script backend
- [ ] Implement rate limiting on submission endpoint
- [ ] Add honeypot fields to prevent spam
- [ ] Document security practices in README

---

## Priority Tasks (Next Session)

1. **Make repo public** — Update visibility setting
2. **Finalize documentation artifacts** — Complete walkthrough.md and new_conversation.md
3. **Test form validation** — Verify all form fields validate correctly
4. **Test backend submission** — Ensure data flows to Google Sheet correctly
