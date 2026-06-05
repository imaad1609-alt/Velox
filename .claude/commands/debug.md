---
description: Structured debugging session — reproduce, isolate, diagnose, and fix a bug systematically.
argument-hint: "<error message or problem description>"
---

Run a structured debugging session on the problem below and fix the root cause, not just the symptom.

Problem: $ARGUMENTS

If nothing was provided, ask for the error message/stack trace, repro steps, what changed recently, and expected vs. actual behavior.

## Process

1. **Reproduce** — Establish expected vs. actual behavior, exact repro steps, and scope (when did it start, who/what is affected).
2. **Isolate** — Narrow to the component, context, or `/utils` function. Check recent changes (commits, dependency/Expo SDK bumps, Firestore rules/config). Read the relevant logs and error text.
3. **Diagnose** — Form hypotheses and test them by tracing the code path. Identify the underlying root cause.
4. **Fix** — Apply the fix, consider side effects and edge cases, and note any regression guard or test worth adding.

## Velox-specific suspects to check

- Firestore access not going through `/utils`, or a util used while `auth.currentUser` is null (throws `"Not logged in"`).
- Missing loading / error / empty handling around a Firestore call.
- Active-workout state duplicated in local state instead of living only in `WorkoutContext` (breaks `MiniWorkoutBar` persistence across tabs).
- Expo SDK 54 API mismatch — verify against https://docs.expo.dev/versions/v54.0.0/.
- Exercises matched by **name** (workouts are denormalized) — a rename or casing mismatch silently drops stats.

## Output

```markdown
## Debug Report: [Issue Summary]

### Reproduction
- **Expected**: ...
- **Actual**: ...
- **Steps**: ...

### Root Cause
...

### Fix
...

### Prevention
- [Guard or test to add]
```
