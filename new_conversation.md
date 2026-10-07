# New Conversation / Agent Handoff

## Project Context
This repository is a public-safe starter for a conference registration application. It follows a simple architecture:
- static frontend
- Google Apps Script backend
- Google Sheets as the persistence layer
- optional Google Drive upload for receipt files

The aim is to build a registration system that remains safe to share publicly without exposing Google IDs, scripts, or other sensitive configuration.

---

## Repository Status
The project is in an early but functional starter phase. The repo includes:
- base frontend scaffolding
- a mode switch between Adult and Kids registration
- placeholder configuration files
- a backend template for Google Apps Script
- a clean `.gitignore` and example environment files

The codebase is intentionally not production complete yet. It should be treated as a reusable starter, not as a final production deployment.

---

## Core Objective
You are an expert software engineering agent. Your job is to maximize clarity, correctness, and security while remaining efficient and focused.

Use the repo's project artifacts as the single source of truth:
- `implementation_plan.md` — current checklist of technical work
- `walkthrough.md` — architecture and system understanding
- `README.md` — general project overview

Do not rely on chat history as long-term memory. Always read the project docs first.

---

## Operating Rules
1. Read `implementation_plan.md` and `walkthrough.md` before making changes.
2. Before writing code, update `implementation_plan.md` if scope changes.
3. Execute work in focused, incremental steps.
4. Keep file modifications small and intentional.
5. Never expose real Google IDs, deployment URLs, or secret configuration in source control.
6. Keep all config values in local files or environment variables.
7. Prefer security and maintainability over premature complexity.
8. When features are added, update the architecture docs in the same pass.

---

## Current Development Focus
The next priority is to turn the starter into a functional registration flow with:
- field validation
- proper success/error states
- real Google Apps Script submission testing
- receipt upload flow for kids registrations
- data verification in Google Sheets
- future admin dashboard support

---

## File Structure to Know
```text
.
├── README.md
├── implementation_plan.md
├── walkthrough.md
├── new_conversation.md
├── .gitignore
├── .env.example
├── package.json
├── public/
│   ├── app.js
│   ├── config.js.example
│   ├── index.html
│   ├── styles.css
│   └── config.js
├── backend/
│   ├── Code.gs
│   └── README.md
└── .gitignore
```

---

## Security Guardrails
- Never commit actual spreadsheet IDs.
- Never commit actual Google Drive folder IDs.
- Never commit live Apps Script `/exec` URLs.
- Do not store secrets in public files.
- Always replace placeholders before deployment.
- If a secret appears in the repo, remove it immediately and rotate if necessary.

---

## Recommended Workflow
1. Read docs and confirm state.
2. Update implementation plan if the scope changes.
3. Implement the smallest meaningful unit of work.
4. Confirm it works locally.
5. Update `walkthrough.md` to reflect the current architecture.
6. Commit changes with a clean, descriptive message.

---

## Final Guidance
This project should remain secure, public-safe, and easy to understand for later agents. The repository is a starter template, not a final business-critical deployment. Keep it modular, understandable, and safe.

The long-term goal is to evolve this into a polished registration system with a working backend integration and a clear admin/reporting layer.
