---
description: Review code changes for security, performance, correctness, and maintainability.
argument-hint: "<files, diff, or PR — defaults to the current diff>"
---

Review the changes below across the dimensions listed. If nothing is specified, review the current working-tree diff (`git diff`); if there is none, ask what to review.

Target: $ARGUMENTS

## Dimensions

- **Security** — auth/authorization flaws, secrets or credentials in code (esp. `firebaseConfig.js` / `serviceAccountKey.json`), Firestore rules gaps, injection, insecure data handling.
- **Performance** — N+1 / unbounded Firestore reads, missing pagination, expensive work on every render, leaked subscriptions/timers (every `onSnapshot` and `setInterval` must be unsubscribed/cleared), O(n²) in hot paths.
- **Correctness** — edge cases (empty/null input, blank sets), race conditions, error propagation, off-by-one, type safety (`any` without justification).
- **Maintainability** — naming clarity, single responsibility, duplication, non-obvious logic documented.

## Velox conventions to enforce

- All Firestore access through `/utils`; components stay presentational, logic in `/utils` or `/contexts`.
- Active-workout state only in `WorkoutContext` — never duplicated in local state.
- Every Firestore call handles loading, error, and empty states in the UI.
- TypeScript strict; functional components/hooks only; PascalCase components, camelCase functions/vars.
- No new state libraries or conflicting UI libraries; match existing inline-`StyleSheet` patterns.
- Expo SDK 54 APIs verified against the versioned docs.

## Output

```markdown
## Code Review: [target]

### Summary
[1-2 sentences on the changes and overall quality]

### Critical Issues
| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|

### Suggestions
| # | File | Line | Suggestion | Category |
|---|------|------|------------|----------|

### What Looks Good
- ...

### Verdict
[Approve / Request Changes / Needs Discussion]
```
