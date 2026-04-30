---
name: qa
description: >
  Run QA tests for WellFit EMR. Analyzes git diff to determine affected areas,
  runs configured test flows with multiple personas, and generates diff-targeted tests.
  Uses agent-browser for web testing.
  Use when testing PRs, releases, or smoke testing environments.
---

# QA Orchestrator

**SCOPE: This skill performs manual/functional QA only -- verifying that the application actually works by interacting with it as a real user would (browser, API calls). Do NOT run or report on CI checks, linting, ESLint, typecheck, unit tests, or any static analysis. Those are handled by separate workflows.**

## Step 1: Load Configuration

Read `.factory/skills/qa/config.yaml` for environment URLs, credentials, personas, and app definitions.

## Step 2: Determine Target Environment

Use the `default_target` from config unless the user specifies a different environment.
Respect any environment restrictions (e.g., no user creation in prod).

**CRITICAL: This project runs locally only.** There are no preview deployments. QA must:
1. Start the dev server locally using the commands in config.yaml
2. Poll localhost until ready
3. Test against localhost

If the dev server cannot start, report ALL tests as BLOCKED with the specific error.

## Step 3: Analyze Git Diff

Run `git diff` to determine what changed. Map changed files to apps using the `path_patterns` in config.yaml.

Files that don't match ANY app's path_patterns (e.g., `.factory/skills/**`, `docs/**`, `.github/**`, config files) are NOT associated with any app. Do NOT run app test flows for them.

For each affected app:

- Run ONLY that app's flows from its module file
- Generate ADDITIONAL targeted tests based on the specific changes in the diff

For apps NOT affected by the diff:

- Do NOT load or run their module. Do NOT run their flows. Do NOT run their pre-flight checks. They are completely out of scope.
- Do NOT test server if only web files changed. Do NOT test web if only server files changed. The diff determines scope, period.

If NO app is affected by the diff (e.g., docs-only, CI-only, or config-only changes), report as INCONCLUSIVE: "No app code changed -- QA not applicable for this diff." Do NOT run any app flows.

## Step 4: Pre-flight Checks (app-specific only)

Run pre-flight checks ONLY for the apps that are affected by the diff.

**Web app testing:**
1. Ensure the server dev server is running (`bun run dev:server`)
2. Ensure the web dev server is running (`bun run dev:web`)
3. Poll `http://localhost:3001` until it responds
4. Ensure seed data exists (run `bun run seed` if needed)

**Server app testing:**
1. Ensure the server dev server is running (`bun run dev:server`)
2. Poll `http://localhost:3000` until it responds
3. Test health endpoints

Do NOT run pre-flight checks for apps that are NOT affected. If a pre-flight check fails for an affected app, report it as BLOCKED with the specific error and remediation steps -- but still proceed with other affected apps.

## Step 5: Execute Diff-Relevant Flows Only

For each app that IS affected by the diff, read its sub-skill from `.factory/skills/qa-<app-name>/SKILL.md`.

The sub-skill contains a MENU of available test flows. You must:

1. Read the diff carefully and identify which flows are relevant to the change
2. Run those flows PLUS any adjacent flows that verify the change integrates correctly (e.g., if a new form field is added, test that the form submits, that validation works, that the data appears in the list view)
3. Do NOT run completely unrelated flows (e.g., if the diff only adds a patient field, do NOT test /chat, /admin, or billing)
4. If no existing flow covers the change, write a NEW ad-hoc test that directly verifies the changed behavior
5. Do NOT run unit tests, lint, typecheck, or any automated test suite. This is manual/functional QA -- interact with the app as a real user would.

## Step 6: Evidence Capture

After each significant test step, capture evidence. Use **text snapshots as primary evidence** -- they render inline in the PR comment with no image hosting issues.

For web apps (agent-browser):

- Use `agent-browser snapshot` to capture the page's accessibility tree as text evidence
- Save screenshot files to `./qa-results/$RUN_ID/` for the artifact upload
- Do NOT embed `![image](url)` markdown in the report -- screenshot images cannot be displayed inline in GitHub PR comments. Instead, mention the filename and note that it's available in the downloadable artifacts.

Evidence quality rules:

- Focus on the RELEVANT content. Trim snapshots to the meaningful part.
- Label each snapshot clearly: what it shows and why it matters for the test.
- NEVER embed broken image links. If you can't verify an image URL will resolve, use text evidence instead.
- The workflow uploads all files in `./qa-results/` as a downloadable artifact -- reference that for visual evidence.

## Step 7: Test Quality Gate

TEST QUALITY REQUIREMENTS:

1. CHANGE-SPECIFIC FIRST. Prioritize tests that directly verify the behavioral change in the diff. At least half your tests should be testing the new/changed feature itself.
2. INTEGRATION TESTS ARE VALID. Tests that verify the change integrates correctly with existing features are good (e.g., new field appears in list view, form validation catches invalid input). These are NOT smoke tests -- they verify the change didn't break integration points.
3. NO UNRELATED FLOWS. Do NOT test features completely unrelated to the diff (e.g., don't test /settings when only /patients changed, don't test chat when only encounters changed).
4. NO AUTOMATED TEST SUITES. Do NOT run jest, vitest, npm test, or any CI-style checks. This is manual/functional QA only.
5. NEGATIVE TESTS. Include at least 1 test verifying error handling or boundary conditions related to the change.
6. INTERACTIVE TESTING. Test by actually interacting with the app as a real user would.
7. INCONCLUSIVE IF UNSURE. If you cannot articulate what the PR changes, mark as INCONCLUSIVE rather than PASS.

## Step 8: Handle Failures

**Never silently skip a flow.** If a flow cannot complete, report it as BLOCKED with what was tried and how the user can fix it. Then continue to the next flow -- never abort the entire run for a single failure.

## Step 9: Generate Report

Generate the report at `./qa-results/report.md` using `.factory/skills/qa/REPORT-TEMPLATE.md`.

The report MUST follow the template in `.factory/skills/qa/REPORT-TEMPLATE.md`. Key rules:

- Start with `## QA Report` heading followed by the test results table
- Result column MUST use emojis: :white_check_mark: PASS, :x: FAIL, :no_entry: BLOCKED, :warning: FLAKY, :grey_question: INCONCLUSIVE
- Keep it CONCISE. The table + a short "Action Required" section (if any) + collapsed screenshots = the entire report.
- Do NOT include: "Behavioral Change Summary", "Blocked Flows" prose, "Info" metadata table, or verbose explanations of what the diff does. The reviewer already knows that.
- Do NOT report setup/prerequisite steps (building, startup, launching, seeding) as test rows. Those are means to an end, not test cases. Only report rows that verify actual user-facing behavior or the specific behavioral change from the diff.
- Put ALL evidence in a single collapsed `<details>` block
- For web evidence: embed accessibility tree snapshots as text. Reference screenshot filenames for visual proof (available in downloadable artifacts). Do NOT use `![image](url)` markdown -- the URLs won't resolve and will show broken images.

## Step 10: Suggest Skill Updates (Failure Learning)

After generating the report, check if any BLOCKED or FAIL results revealed a **testing environment insight** that would help future QA runs succeed. This is about learning how the testing environment works, NOT about fixing bad selectors or skill typos.

**Good suggestions** (environment/workflow knowledge):

- "Better Auth session expires after X minutes -- re-authenticate before long test runs"
- "The dev server requires `bun run dev:web` AND `bun run dev:server` running simultaneously"
- "SQLite write conflicts occur if server is running during seed -- always stop server first"
- "Chat streaming takes 15+ seconds for first response -- increase wait timeout"

**Bad suggestions** (skill bugs, not environment insights -- do NOT suggest these):

- "Selector data-testid=foo doesn't exist" -- that's a skill bug, fix it directly
- "The button text changed from X to Y" -- that's expected from the PR diff

Format as a table with severity, collapsible fix prompts, and a count in the heading:

## Suggested Skill Updates (N issues found)

| #   | Severity        | File     | Issue               | Fix Prompt                                                                           |
| --- | --------------- | -------- | ------------------- | ------------------------------------------------------------------------------------ |
| 1   | <emoji> <level> | `<file>` | <short description> | <details><summary>Copy</summary><br>`<full droid prompt to fix the issue>`</details> |

**Severity levels:**

- `🔴 Breaking` -- Causes test failures every run (wrong URL, wrong auth method, missing required step)
- `🟡 Degraded` -- Causes intermittent failures or suboptimal behavior (timing issues, rate limits, locale assumptions)
- `🔵 Info` -- New knowledge that improves future runs but doesn't cause failures (new UI pattern, new endpoint)

Each Fix Prompt must be a self-contained instruction that Droid can execute directly when pasted.

Do NOT suggest updates for failures already covered in Known Failure Modes, bad selectors, or expected behavior changes from the PR. If no genuinely new environment insights were discovered, omit this section entirely.

Since `failure_learning` is `suggest_in_report`: include the table in the report only. Do NOT write `skill-updates.json`.
