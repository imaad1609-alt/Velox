import { SavedWorkout } from "./workouts";

// Cross-workout aggregates (no Firestore here — pass in the result of
// getWorkouts()). Kept separate from exerciseStats.ts, which is per-exercise.

// Map of routineId → the most recent date a workout started from that routine
// was performed. Used by the routines list to show "last performed".
export const lastPerformedByRoutine = (
  workouts: SavedWorkout[]
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const w of workouts) {
    if (!w.routineId) continue;
    if (!map[w.routineId] || w.date > map[w.routineId]) map[w.routineId] = w.date;
  }
  return map;
};
