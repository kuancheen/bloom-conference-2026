# New Conversation Guide — Bloom Conference 2026

This guide helps agents and collaborators quickly understand the project scope, structure, and how to contribute effectively.

---

## 30-Second Summary

**Bloom Conference 2026** is a registration system for a church conference with two tracks:
- Adults submit their info and workshop preferences
- Parents submit their info + child details for the kids' track

The frontend is a static form (`public/`) that POSTs to a Google Apps Script backend (`backend/`) that writes to Google Sheets. **No secrets are in git** — all configuration is local or environment-based.

---

## What This Project Is

✅ **Static frontend** — vanilla HTML/CSS/JS, no build step  
✅ **Google Apps Script backend** — serverless, writes to Google Sheets  
✅ **Public repository** — safe to fork, share, and reuse  
✅ **Conference-specific** — but structured for easy customization  

❌ **Not a full SPA** — no React, Vue, or complex bundling  
❌ **Not a database** — uses Google Sheets as the data store  
❌ **Not production-ready yet** — still in Phase 2 (documentation)  

---

## Quick File Reference

| File | Purpose |
|------|---------|
| `public/index.html` | Form layout (Adult & Kids modes) |
| `public/styles.css` | Design system & responsive layout |
| `public/app.js` | Form logic, state, submission |
| `public/config.js.example` | Template for runtime configuration |
| `backend/Code.gs` | Google Apps Script backend (copy into Apps Script editor) |
| `implementation_plan.md` | Development roadmap & priorities |
| `walkthrough.md` | Deep dive into architecture & data flow |
| `.gitignore` | Excludes secrets (config.js, .env, etc.) |

---

## Common Tasks

### I want to understand the system
→ Read `walkthrough.md` (architecture, data flow, file structure)

### I want to add a new form field
1. Add `<input>` to `public/index.html` (in Adult or Kids section)
2. Add column header in `backend/Code.gs` (in `doPost()`)
3. Update `normalizePayload()` in `public/app.js` if special handling needed
4. Test with `npm run dev` locally, then deploy backend

### I want to style the form
→ Edit `public/styles.css` — uses CSS variables (`--primary`, `--danger`, etc.) for easy theming

### I want to deploy the backend
1. Open `backend/README.md` for step-by-step instructions
2. Copy `backend/Code.gs` into a new Google Apps Script
3. Set `DRIVE_FOLDER_ID` to your folder ID
4. Deploy as web app, copy `/exec` URL
5. Paste URL into `public/config.js`

### I want to add client-side validation
→ This is a Phase 3 task. See `implementation_plan.md` for scope. Likely needs:
- Required field checks in form submit handler
- Email format validation
- Date validation for kids' DOB
- Visual error indicators in UI

### I want to customize for a different conference
→ Editable fields:
- Event name: `public/index.html` (header, "Bloom Conference 2026")
- Dates & info: `public/index.html` (info panel, right sidebar)
- Form fields: `public/index.html` (both form sections)
- Church plants: `public/index.html` (`<option>` values in selects)
- Sheet names: `backend/Code.gs` (`getOrCreateSheet()` calls)
- Styling: `public/styles.css` (CSS variables)

---

## Current Status

**Phase 1: Core Scaffolding** ✅ Complete  
- Frontend form structure, backend template, dev environment

**Phase 2: Repository Visibility & Documentation** 🔄 In Progress  
- [ ] Make repository public
- [x] Create `walkthrough.md` ← you're reading related docs
- [x] Create `new_conversation.md` ← this file
- [ ] Push to GitHub

**Phase 3: Frontend Enhancement** ⏭️ Next  
- Client-side validation, success screens, multiple children, file uploads, draft auto-save

---

## Before You Start

**Do you have access to:**
- The Google Sheet where registrations will be stored?
- A Google Drive folder for receipt uploads (Kids mode)?
- Ability to create & deploy Google Apps Scripts?

If not, ask Kuan Cheen to set these up.

**Have you configured:**
- `public/config.js` with your Apps Script deployment URL?
- `backend/Code.gs` with your Drive folder ID?

If not, follow the backend README.

---

## Testing Checklist

When you make changes, verify:

- [ ] **Local dev works** — `npm run dev` starts server
- [ ] **Form renders** — open http://localhost:3000, see form
- [ ] **Mode toggle works** — switch between Adult & Kids tabs
- [ ] **Submission (dry run)** — fills form, clicks submit, sees status message
- [ ] **Error handling** — wrong config URL shows clear error
- [ ] **Responsive design** — resize browser, layout adapts
- [ ] **Backend (if deployed)** — data actually appears in Google Sheet

---

## Code Style & Conventions

**JavaScript:**
- Use `const` by default, `let` if reassignment needed
- Camel case for variables & functions
- Descriptive names (`normalizePayload`, not `process`)
- Comments for non-obvious logic

**HTML:**
- Semantic tags (`<form>`, `<label>`, `<input>`)
- Data attributes for JS hooks (`data-mode`, `data-*`)
- Accessibility: `aria-*` attributes where needed

**CSS:**
- CSS variables for colors, spacing, sizing
- Mobile-first responsive design
- Class names kebab-case (`.mode-btn`, `.field-row`)

**Git:**
- Commit messages: "Add X feature" or "Fix Y bug"
- Branch for features: `feature/validation`, `fix/style-issue`
- PR title: "Phase 3: Add client-side form validation"

---

## Common Gotchas

### 1. "Config URL is not set"
**Error:** "Please replace the placeholder Google Apps Script URL"  
**Fix:** Copy `public/config.js.example` to `public/config.js` and fill in your deployment URL

### 2. "Form submits but nothing appears in sheet"
**Error:** No new rows in Google Sheet  
**Fix:** Check that `backend/Code.gs` is deployed as a web app with "Anyone" access

### 3. "File uploads fail"
**Error:** "Upload failed" in sheet, or blank URL  
**Fix:** Verify `DRIVE_FOLDER_ID` in `backend/Code.gs` is correct and the folder exists

### 4. "Style changes don't apply"
**Error:** CSS seems cached  
**Fix:** Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## Asking for Help

When you get stuck, share:
1. **What you're trying to do** — "I want to add date validation"
2. **What happened** — "Form submitted but no error message"
3. **Error message** (if any) — full text from console or status box
4. **What you've already tried** — "checked config.js, it's set correctly"

---

## Resources

- **Architecture & data flow** → `walkthrough.md`
- **Development roadmap** → `implementation_plan.md`
- **Backend setup** → `backend/README.md`
- **Project overview** → `README.md`
- **GitHub repo** → https://github.com/kuancheen/bloom-conference-2026

---

## Next Steps

1. **Read** `walkthrough.md` to understand the system
2. **Set up** locally: `npm install && npm run dev`
3. **Deploy** the backend (if not already done) — see `backend/README.md`
4. **Test** form submission end-to-end
5. **Pick a Phase 3 task** from `implementation_plan.md` and open an issue

Welcome aboard! 🌸

