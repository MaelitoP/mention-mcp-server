---
name: next-issue
description: Pick the next unblocked GitHub issue of this repository's roadmap, implement it as one commit and merge it through a pull request once CI is green. Use when asked to implement the next issue, continue the roadmap, or work on the next task. Pass an issue number to work on that issue instead.
---

# Implement the next roadmap issue

The roadmap lives in GitHub issues grouped by milestone (one milestone per release). Each issue is one commit. Several agents work on this repository at the same time, so claim an issue before touching code.

## 1. Pick

If an issue number was given, use it and skip to the checks below. Otherwise list the candidates:

```bash
gh issue list --state open --search "no:assignee -label:needs-maintainer" \
  --json number,title,milestone,body --limit 100
```

Take the issue in the lowest-versioned milestone, then the lowest number, that passes both checks:

- Every issue on its `Blocked by: #N, #M` line is closed (`gh issue view N --json state`). An open pull request does not count; the blocker must be merged.
- No remote branch `issue-<number>` exists (`git ls-remote --heads origin issue-<number>`).

Issues labelled `needs-maintainer` need a human with account access. Never pick them.

If nothing qualifies, say which issues are waiting on which blockers and stop.

## 2. Claim

Start from an up-to-date `main`. If this checkout has uncommitted changes or is on another branch, work in a new git worktree instead of disturbing it.

```bash
git fetch origin
git switch -c issue-<number> origin/main
git push -u origin issue-<number>
gh issue edit <number> --add-assignee @me
```

The push is the lock. If it is rejected because the branch already exists, another agent has the issue: delete your local branch and go back to step 1.

## 3. Implement

Read the whole issue. Its Problem, Change and Acceptance sections are the scope; do not add anything they do not ask for. Read `ARCHITECTURE.md` if it exists, and every file you are about to change.

If the issue turns out to be wrong, already done, or impossible without a decision, do not improvise. Comment on the issue with what you found, remove yourself as assignee, delete the remote branch and stop.

When a TypeScript design question comes up (API shape, type modelling, error strategy, module layout), ask the `typescript-expert` skill if it is available, rather than guessing. Skip this when the skill is not installed.

House rules:

- The smallest change that satisfies the acceptance list. No new dependency unless the issue names it.
- No code comments unless they state a constraint the code cannot express.
- Tests assert behaviour through the public surface. No sleeps as synchronisation, no method added to production code only for a test, no near-duplicate test bodies.
- Tool names, parameters and response shapes change only when the issue is labelled `breaking`.
- When the change is visible to users, add a line under `## [Unreleased]` in `CHANGELOG.md`. When it changes how the server is structured, update `ARCHITECTURE.md`.
- This repository is public. Commits, pull requests and comments may only describe the Mention API as its public documentation (https://dev.mention.com) or its observable behaviour does. Never paste material from a private source.

## 4. Verify

```bash
npm run check && npm run build && npx vitest run
```

All three must pass. Then go through the acceptance list and confirm each item by running or reading the result, not by assumption.

If the `typescript-review` skill is available, run it on the diff before committing. Fix the findings that are real defects within the issue's scope and run the three commands again. List in the pull request body any finding you chose not to act on, with the reason. Skip this when the skill is not installed, and say so in the pull request body.

## 5. Ship

One commit. Its subject must follow Conventional Commits (https://www.conventionalcommits.org): `type(scope): summary`, with `!` before the colon for a breaking change. Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`. Issue titles are already written this way, so use the issue title exactly. The pull request title is the same string.

The commit message is the subject line only: no body, no description, no trailers. The explanation belongs in the pull request.

If you need a further commit on the branch (for example after a CI failure), it follows the same format. Never commit with a subject such as "wip", "fixes" or "address review".

```bash
git commit -m "<issue title>"
git push
gh pr create --title "<issue title>" --body "<body>"
```

Every pushed branch gets a pull request; never leave one without. The body states what changed, how each acceptance item was verified, anything left unverified, and ends with `Closes #<number>`.

Then wait for CI and merge:

```bash
gh pr checks <pr> --watch --fail-fast
gh pr merge <pr> --rebase --delete-branch
```

- Merge only when every check is green. Rebase-merge keeps the commit subjects on `main` as written, with no merge commit.
- If a check fails, read the log, fix the cause within the issue's scope, push and wait again. Never merge red, skip a check or weaken a test to get green.
- If you cannot get CI green, or anything on the acceptance list is unverified, leave the pull request open, say why in a comment on it and stop.
- After merging, confirm the issue closed and the remote branch is gone.

Report the merged pull request URL. Never tag or publish, and do not start a second issue in the same run unless asked.
