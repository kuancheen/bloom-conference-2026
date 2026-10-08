# Core Objective
You are an expert software engineering agent working on the Bloom Conference 2026 Registration System. To maximize token efficiency, prevent context bloat, and maintain an accurate project state, you must manage and rely on two specific repository artifacts: `implementation_plan.md` and `walkthrough.md`. Do not rely on chat history for long-term project memory.

# The Two Artifacts
1. **`implementation_plan.md`**: A strict checklist of pending technical tasks, architecture decisions, and remaining steps.
2. **`walkthrough.md`**: A living document explaining the current system architecture, file structures, verified features, technical debt, and host setup (Apps Script, WordPress, `.htaccess`).

# Operational Workflow (Every Conversation)

## Step 1: Initialize Context (Read State)
At the very beginning of any new session or task block, locate and read `implementation_plan.md` and `walkthrough.md` using `view_file`. Use them to understand the exact state of the project. Do not ask the user for context that is already documented in these files.

## Step 2: Planning & Execution
- Before writing code, if the current request changes the scope, update `implementation_plan.md` with the new granular steps first.
- Execute tasks one specific block at a time.

## Step 3: Atomic State Handover (Clean-up & Move)
As soon as a feature or task is successfully implemented, verified, and checked off, you must immediately update both files in a single pass:
1. **REMOVE** or mark as completed (`- [x]`) the finished task in `implementation_plan.md`.
2. **ADD** the technical details of the completed feature (file paths, how it works, data flow) into `walkthrough.md`.
3. If an implementation step was completed but broke an existing system, update `walkthrough.md` to reflect the fixed architecture and lessons learned.
4. Immediately proceed to the Git Commit phase detailed below.

# Git Commit & Sync Rule
Every time a task block or sub-task is completed, you must commit the changes to the Git repository. Do not leave uncommitted files at the end of an interaction block.
- **What to stage**: Stage and commit the updated `implementation_plan.md`, `walkthrough.md`, `new_conversation.md`, all newly created application files, and all modified source files.
- **Commit Message Format**: Use clear, descriptive conventional commit messages that state exactly what was completed (e.g., `feat: implement confirmation email in Code.gs and update project artifacts`).

# Formatting Rules
- Keep `implementation_plan.md` concise. It should be a crisp list of checkboxes (`- [ ] task`) grouped by priority or module.
- Keep `walkthrough.md` structured and descriptive. Use code blocks, file trees, and entry-point descriptions so any fresh agent can read it and instantly understand the current codebase.

# File Editing Rules

## The Golden Rule
ALWAYS view a file before editing it. No exceptions. Even if you think you know what's in it.

## Allowed Tools
| Situation | Correct tool |
|-----------|-------------|
| File does not exist yet | `write_to_file` (no Overwrite) |
| File exists — add, change, or append anything | `replace_file_content` only |

## Forbidden Patterns
- Never use `write_to_file` with `Overwrite: true` on an existing file. This silently destroys all existing content.
- Never skip reading a file and assume it is empty or unimportant before editing it.
- If `write_to_file` fails because the file already exists, stop — do not retry with `Overwrite: true`. Instead, view the file, then use `replace_file_content`.

## Mandatory Workflow for Editing Any Existing File
1. `view_file` — read the full current content.
2. Identify the exact lines to add/change.
3. `replace_file_content` — touch only those lines, leave everything else intact.

## Why This Matters
Past mistakes in this project:
- `implementation_plan.md` and `walkthrough.md` were both fully overwritten using `write_to_file`, destroying all original detail (architecture tables, data flow diagrams, benchmark results, common operations, etc.). Required recovery from git.
- `new_conversation.md` was overwritten with a single line because the agent skipped reading it first and used `Overwrite: true` when the initial write failed.
