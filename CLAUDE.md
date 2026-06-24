# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Velox** is a cross-platform fitness app that merges **Hevy-style workout tracking** with **Cronometer-style nutrition logging** into one product. Built with Expo + React Native, backed by Firebase. It is being built for **real App Store deployment, not a demo** — code quality and correctness matter.

> Naming note: the folder, Firebase project, and notes call this **FitFuel**, but the shipping app is **Velox** (`app.json`, `package.json` `name: velox`, the login title). Same app.

## Critical: Expo SDK 54

This project pins **Expo SDK 54** (React Native 0.81, React 19). Expo APIs change between versions. Before writing any Expo/RN code, consult the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ — do not rely on memory or older API shapes.

## Commands

```bash
npm install            # install deps
npx expo start         # start Metro dev server (press i / a / w, or scan QR for Expo Go)
npm run ios            # start + open iOS simulator
npm run android        # start + open Android emulator
npm run web            # start + open web
npm run lint           # eslint (eslint-config-expo)
```

No test runner is configured. `npm run reset-project` is create-expo-app scaffolding — **do not run it**, it moves `app/` aside.

## Tech stack

- **Language:** TypeScript (strict)
- **Framework:** React Native + Expo, with **Expo Router** (file-based routing in `/app`). Typed routes and the React Compiler are both enabled (`app.json` `experiments`). Path alias `@/*` → project root.
- **State:** React Context — `WorkoutContext` for the active session, `ExercisesProvider` for the live catalog. No Redux/Zustand.
- **Backend / DB:** Firebase Firestore + Firebase Auth
- **Charts:** custom `LineChart` component — no external chart library

## Architecture

### Routing & auth gate
`app/_layout.tsx` is the root. It subscribes to Firebase `onAuthStateChanged` and renders `<Login>` until a user exists; only then mounts the `<Tabs>` navigator wrapped in `ExercisesProvider` → `WorkoutProvider`. Tab screens are flat files in `/app`: `index` (Dashboard), `workout`, `nutrition`, `profile`. `login` is registered with `href: null` to stay out of the tab bar.

### State: two app-wide contexts (mounted above the tabs)
- **`WorkoutContext`** (`contexts/WorkoutContext.tsx`) holds the single *in-progress* workout — exercises, sets, a per-second elapsed timer, and minimized/expanded state. It lives above the navigator so an active workout **survives tab switches**; `MiniWorkoutBar` is the persistent floating control rendered alongside the tabs. The in-progress workout is snapshotted to **AsyncStorage** (`velox.activeWorkout`) on every change and restored on launch, so it also survives an app restart (the timer resumes from the persisted absolute `startTime`). It is only persisted to **Firestore** on finish.
- **`ExercisesProvider`** (`contexts/ExercisesProvider.tsx`) supplies the exercise catalog via `useExercises()`.

### Data layer — `/utils` (the only place that talks to Firestore)
Screens and components **never** call Firestore directly. Per-user data is namespaced under `users/{uid}/...`; each util reads `auth.currentUser?.uid` and throws `"Not logged in"` if absent.
- `utils/workouts.ts` — `users/{uid}/workouts`. `saveWorkout`, `getWorkouts` (one-shot, newest-first). Exercises are stored **by name** (denormalized).
- `utils/routines.ts` — `users/{uid}/routines`. Reusable templates; uses a **live `onSnapshot` subscription** (`subscribeRoutines`) plus create/update/delete. `updateRoutine` always bumps `updatedAt`.
- `utils/exercises.ts` — `subscribeExercises`: the bundled `EXERCISES` array is the baseline (works offline / first launch); Firestore docs in the top-level `exercises` collection (keyed by id) are merged on top field-by-field, with Firestore-only exercises appended. Any error falls back to the bundled list.
- `utils/exerciseStats.ts` — pure functions (no Firestore). Per-session aggregates and all-time PRs from `SavedWorkout[]`; 1RM uses the Epley estimate `weight * (1 + reps/30)`. Matches exercises by name.

### Catalog & components
`constants/exercises.ts` is the source of truth: the `Exercise` type, the `MuscleGroup`/`Equipment`/`Difficulty` unions, the **195 bundled exercises**, and shared `MUSCLE_COLORS`. Reusable UI in `/components` — `ExercisePicker`, `ExerciseDetail`, `RoutineEditor`, `MiniWorkoutBar`, `MuscleMap`/`MuscleChip` (via `react-native-body-highlighter`), `LineChart`. Styling is inline `StyleSheet`, dark theme (background `#0D0D0D`, accent `#6C63FF`).

### Firebase config
`firebaseConfig.js` exports `auth` and `db`. Auth uses **durable persistence** — `getReactNativePersistence(AsyncStorage)` on native and `browserLocalPersistence` on web — so a logged-in session **survives an app restart** (no re-login each launch); `app/_layout.tsx`'s `onAuthStateChanged` restores it on boot. The web `apiKey` is a public client identifier (safe to commit); `serviceAccountKey.json` is the admin credential and is gitignored.

## Coding conventions

- TypeScript strict. Type everything. No `any` unless justified with a comment.
- Functional components and hooks only. No class components.
- PascalCase for components, camelCase for variables and functions.
- All Firestore reads/writes go through `/utils`. Never call Firestore directly inside a component.
- Active workout state lives **only** in `WorkoutContext`. Do not duplicate it in local state.
- Every Firestore call must handle **loading, error, and empty** states in the UI.
- Keep components presentational. Push business logic into `/utils` or `/contexts`.
- Match existing file and naming patterns before inventing new ones.

## Things to avoid

- **Do NOT re-run `scripts/seedExercises.ts`.** It has already run; re-running would duplicate all 195 exercises. (It is a one-time admin uploader run from Node, not the app.)
- Do NOT edit or expose secrets in `firebaseConfig.js`, and never commit `serviceAccountKey.json`.
- No new state-management libraries — stick with Context (no Redux/Zustand).
- Do not break `MiniWorkoutBar` persistence across tabs — it must survive navigation.
- Do not introduce a UI component library that conflicts with the current inline-`StyleSheet` styling.

## UI / design bar

Velox should look intentional and distinctive, never generic "AI-app" default. Because this is React Native (inline `StyleSheet`, not web CSS), apply the spirit of these guidelines within the existing dark theme:

- **Commit to a direction.** Refined minimalism and bold expression both work — what matters is intentionality and consistency with the established palette (`#0D0D0D` base, `#6C63FF` accent, `MUSCLE_COLORS` for data).
- **Typography:** distinctive, characterful type via `expo-font`; pair a display font with a clean body font. Avoid flat system-default look.
- **Motion:** purposeful micro-interactions via `react-native-reanimated` and `expo-haptics`. High-impact moments (set completion, PR hit, workout finish) over scattered animation.
- **Depth & detail:** use `expo-linear-gradient`, layered surfaces, and shadows to create atmosphere instead of flat solid fills.
- **Avoid** cliché AI aesthetics — generic fonts, purple-gradient-on-white, cookie-cutter card layouts. Every screen should feel designed for a fitness product.

## Workflows

Two structured workflows are available as guidance when you ask for them:

- **Debug** (`/debug <error or symptom>`) — Reproduce → Isolate → Diagnose → Fix. Output a report with Reproduction (expected/actual/steps), Root Cause, Fix, and Prevention. Find the **root cause**, not just the symptom; consider side effects.
- **Code review** (`/code-review <files or diff>`) — review across **Security** (auth, secrets, injection), **Performance** (N+1, unbounded queries/loops, complexity, leaks), **Correctness** (edge cases, null/empty, race conditions, type safety), and **Maintainability** (naming, single responsibility, duplication). Output Summary → Critical Issues → Suggestions → What Looks Good → Verdict.
