# Bloom Conference 2026 — System Walkthrough

## Project Overview

A conference registration system for Bloom Conference 2026 with two registration tracks:
- **Adult 13+** — full participant details, workshop selection
- **Kids 5-12** — parent/guardian + child details, payment receipt tracking

The system uses a **static frontend** (HTML/CSS/JS) connected to a **Google Apps Script backend** that writes registrations to Google Sheets and manages file uploads to Google Drive.

**Key principle:** No secrets (spreadsheet IDs, deployment URLs, Drive folder IDs) are committed to version control.

---

## Architecture

### Frontend → Backend Flow

```
User fills form
       ↓
Client-side validation & state management (app.js)
       ↓
Form submission → normalizePayload()
       ↓
POST to Google Apps Script /exec URL
       ↓
Backend validates, writes to sheet, uploads files
       ↓
Response returned to frontend (success or error)
       ↓
User sees status message
```

### Storage

- **Adults registrations** → `Adults` sheet in Google Sheet
- **Kids registrations** → `Kids` sheet in Google Sheet
- **Receipt files** → Google Drive folder (configured via `DRIVE_FOLDER_ID`)

---

## File Structure

```
bloom-conference-2026/
│
├── public/                          # Frontend (static, public-ready)
│   ├── index.html                   # Registration form layout
│   ├── styles.css                   # Design system & responsive layout
│   ├── app.js                       # Form logic, state, submission
│   ├── config.js                    # (gitignored) Runtime config with API URL
│   └── config.js.example            # Template for config.js
│
├── backend/                         # Google Apps Script
│   ├── Code.gs                      # Apps Script backend template
│   └── README.md                    # Backend setup instructions
│
├── .gitignore                       # Excludes config.js, .env, node_modules
├── .env.example                     # Template for local environment variables
├── package.json                     # Dev dependencies (serve)
├── README.md                        # Project overview & setup
├── implementation_plan.md           # Development roadmap
└── walkthrough.md                   # This file
```

---

## Component Details

### Frontend: `public/index.html`

**Structure:**
- **Header** — title, theme info
- **Mode toggle** — switches between Adult 13+ and Kids 5-12
- **Adult form section** — name, phone, email, church plant, homes code, workshop track, remarks
- **Kids form section** — parent details, child details (name, DOB, gender, church plant, allergies)
- **Status box** — shows submission feedback (success/error)
- **Submit button** — triggers form validation and submission

**Key features:**
- Two distinct form sections hidden/shown via CSS
- Both sections initialize with all fields (no dynamic field addition yet—Phase 3 work)
- Uses semantic HTML (`<form>`, `<label>`, `<input>`, etc.)
- Accessibility markers (`aria-live`, `aria-selected`, `role="tablist"`)

### Frontend: `public/styles.css`

**Design system:**
- **Colors** — CSS variables for consistency (`--primary`, `--danger`, `--success`, etc.)
- **Typography** — Inter font family, 400–800 weights
- **Spacing** — 8px base unit, consistent margins & padding
- **Layout** — Two-column grid (form + info panel) on desktop, single column on mobile
- **Interactive** — Smooth transitions, focus states, gradient buttons

**Key classes:**
- `.panel` — card container with shadow & border
- `.mode-btn` — toggle buttons with active state styling
- `.field-row` — two-column input grid
- `.status-box` — feedback messages (success/error/info)
- `.primary-btn` — submit button with gradient

**Responsive:**
- Media query at 820px switches to single-column layout
- Uses `clamp()` for fluid typography

### Frontend: `public/app.js`

**State management:**
```javascript
const state = {
  mode: 'adult'  // 'adult' or 'kids'
};
```

**Key functions:**

1. **`setMode(mode)`**
   - Toggles between Adult and Kids form sections
   - Updates button active states
   - Clears previous mode data (form reset handled separately)

2. **`normalizePayload(formData)`**
   - Converts FormData to JSON object
   - **Adult mode:** includes all adult fields
   - **Kids mode:** wraps child data in JSON array, converts payment to number

3. **`submitRegistration(payload)`**
   - Validates Google Script URL is configured
   - POSTs to configured endpoint
   - Returns parsed JSON response

4. **`setStatus(message, type)`**
   - Updates status box with feedback message
   - Applies CSS classes for styling (`is-success`, `is-error`)
   - Used for validation errors and submission feedback

**Event flow:**
```
User clicks mode button → setMode() → updates UI
User fills form & clicks submit → form.addEventListener('submit')
                                → preventDefault()
                                → normalizePayload()
                                → submitRegistration()
                                → setStatus() with result
                                → form.reset() on success
```

**Error handling:**
- Catches missing/invalid Google Script URL
- Catches network/response errors
- Displays human-readable error messages to user
- Status box persists until new action

### Configuration: `public/config.js.example`

```javascript
window.APP_CONFIG = {
  googleScriptUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
};
```

**Setup:**
1. Copy to `public/config.js` (gitignored)
2. Replace `YOUR_DEPLOYMENT_ID` with real Apps Script deployment ID
3. `app.js` reads this at runtime via `getGoogleScriptUrl()`

### Backend: `backend/Code.gs`

**Configuration:**
```javascript
var DRIVE_FOLDER_ID = "YOUR_DRIVE_FOLDER_ID";
```

**Key functions:**

1. **`doGet(e)`** — Returns `{ status: 'ok' }` (health check)

2. **`doPost(e)`** — Main submission handler
   - Parses JSON POST body
   - **Adult path:** appends to `Adults` sheet with all fields
   - **Kids path:** appends to `Kids` sheet, handles file upload, creates UUID for multi-child tracking
   - Returns `{ result: 'success' }` or `{ result: 'error', error: 'message' }`

3. **`getOrCreateSheet(name)`** — Ensures sheet exists before appending

**Adult sheet columns:**
```
Date | Type | Name | Phone | Email | Church Plant | Homes Code | 
Session 1 Workshop | Session 2 Workshop | Workshop Track | Remarks
```

**Kids sheet columns:**
```
Date | Type | Parent Name | Parent Phone | Parent Email | Parent Relationship | 
Parent Homes Code | Parent UUID | Child # | Child Name | Child DOB | 
Child Gender | Child Allergies | Child Church Plant | Payment Amount | 
Receipt File URL | Remarks
```

**File upload (Kids mode):**
- Decodes base64 file data from payload
- Creates file in configured Drive folder
- Sets public link sharing (VIEW access)
- Stores file URL in sheet, or error message if upload fails

---

## Data Flow Example

### Adult Registration

1. User selects "Adult 13+" tab
2. Fills: name, phone, email, church plant, homes code, workshop track, remarks
3. Clicks "Submit registration"
4. `app.js` collects form data: `{ fullName, phoneNumber, emailAddress, ... }`
5. `normalizePayload()` returns:
   ```json
   {
     "registrationType": "Adult 13+",
     "fullName": "Jane Doe",
     "phoneNumber": "+60123456789",
     ...
   }
   ```
6. `submitRegistration()` POSTs to Apps Script URL
7. Backend `doPost()` detects `registrationType === 'Adult 13+'`
8. Appends row to `Adults` sheet
9. Returns `{ result: 'success' }`
10. Frontend shows green success message, resets form

### Kids Registration with File Upload

1. User selects "Kids 5-12" tab
2. Fills: parent name, phone, email, relationship, homes code, payment amount
3. Fills: child name, DOB, gender, church plant, allergies
4. Optionally uploads receipt image
5. Clicks "Submit registration"
6. `normalizePayload()` returns:
   ```json
   {
     "registrationType": "Acts Kids (5-12)",
     "parentName": "John Doe",
     "paymentAmount": 30,
     "children": "[{\"name\":\"John Jr.\",\"dob\":\"2018-05-15\",...}]",
     "fileData": "base64encodeddata...",
     "fileType": "image/jpeg",
     "fileName": "receipt.jpg"
   }
   ```
7. Backend `doPost()` detects Kids registration
8. Decodes and uploads file to Drive folder
9. Generates UUID for parent (`parentUuid`)
10. Appends row to `Kids` sheet with file URL
11. Returns `{ result: 'success', fileUrl: '...' }`
12. Frontend shows success message, resets form

---

## Development Workflow

### Local Setup

```bash
# Install dependencies
npm install

# Start local dev server (serves public/ on http://localhost:3000)
npm run dev

# Syntax check
npm run check
```

### Backend Deployment

1. Create new Google Apps Script (bound to Google Sheet or standalone)
2. Copy `backend/Code.gs` into editor
3. Set `DRIVE_FOLDER_ID` to real value
4. Deploy as web app: **Deploy** → **New deployment** → **Type: Web app**
   - Execute as: your account
   - Who has access: Anyone
5. Copy generated `/exec` URL
6. Paste into `public/config.js`
7. Test with form submission

### Security Checklist

- [ ] `public/config.js` is gitignored (never commit deployment URL)
- [ ] `.env` is gitignored (never commit Drive folder IDs)
- [ ] Deployment URL rotated if previously shared publicly
- [ ] Google Sheet accessible only to authorized users
- [ ] Drive folder permissions set appropriately
- [ ] No sensitive values in example files

---

## Next Steps (Phase 3+)

- **Client-side validation** — email format, required fields, date validation
- **Dynamic UI states** — loading spinners, disabled buttons, success screen
- **Multiple children** — add/remove child rows in Kids mode
- **File uploads** — receipt image picker and preview
- **LocalStorage** — auto-save draft registrations
- **Admin dashboard** — view/filter/export registrations

