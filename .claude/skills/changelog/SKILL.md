---
name: changelog
description: Update CHANGELOG.md after a bug fix or new feature, suggesting the next semver version.
allowed-tools: Read, Edit, Bash(git *)
---

You are updating CHANGELOG.md for the Audist project following semantic versioning (semver).

## Current CHANGELOG.md

```markdown
!`cat CHANGELOG.md 2>/dev/null || echo "(no CHANGELOG.md found)"`
```

## Current package.json version

!`node -p "require('./package.json').version" 2>/dev/null || grep '"version"' package.json | head -1`

## Unreleased changes since the last version tag

```
!`git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --pretty=format:"- %s (%h)" 2>/dev/null || git log --oneline -20`
```

## Merged pull requests (recent)

```
!`gh pr list --state merged --limit 15 --json number,title,mergedAt --template '{{range .}}- #{{.number}} {{.title}} ({{.mergedAt}}){{"\n"}}{{end}}' 2>/dev/null || echo "(gh CLI not available)"`
```

---

## Your task

The user has asked: $ARGUMENTS

Using the information above, do the following:

### 1. Determine the next version

Apply semver rules to the unreleased changes listed above:
- **patch** (x.y.Z) — only bug fixes (`fix:` commits, no new user-facing features)
- **minor** (x.Y.0) — at least one new feature (`feat:` commit) with no breaking changes
- **major** (X.0.0) — breaking API/UX changes (rare; confirm with the user first)

State the current version and the suggested next version with a one-sentence justification.

### 2. Draft the new CHANGELOG entry

Write a new `## [x.y.z] - YYYY-MM-DD` section (use today's date: !`date +%F`) to insert directly below the `# Changelog` heading. Group entries under:
- `### Added` — new user-facing features
- `### Fixed` — bug fixes
- `### Changed` — non-breaking behaviour changes (omit if empty)

Each bullet should be concise, user-facing prose (not commit message jargon). Include the PR number in parentheses when available.

### 3. Update CHANGELOG.md

Insert the new section into CHANGELOG.md immediately after the `# Changelog` header line (before the previous most-recent release). Do not remove or reorder any existing content.

### 4. Bump version in package.json

Update the `"version"` field in `package.json` to match the new changelog version. The release workflow (`release-mac.yml`) uses `electron-builder`, which reads the version from `package.json` — so the DMG artifact's internal version must match. Without this step, the app ships with the wrong version even if the git tag is correct.

### 5. Confirm

After editing both files, print the new changelog section and the updated `package.json` version so the user can review them. Then remind them to push a `v<new-version>` tag to trigger the release build:

```
git tag v<new-version>
git push origin v<new-version>
```
