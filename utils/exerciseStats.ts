import { SavedWorkout } from "./workouts";

// Per-session aggregates for one exercise, plus all-time personal records.
// Workouts store exercises by name, so we match on name.

export type ExerciseSet = { weight: number; reps: number };

export type ExerciseSession = {
  date: number;
  sets: ExerciseSet[];
  heaviestWeight: number;
  best1RM: number;       // Epley estimate, rounded
  volume: number;        // sum of weight × reps across the session
  bestSetVolume: number; // best single set's weight × reps (Hevy-style)
  mostReps: number;      // most reps in a single set
  totalReps: number;     // reps across the session
};

export type ExercisePRs = {
  heaviestWeight: number;
  best1RM: number;
  bestVolume: number;    // best session volume
  bestSetVolume: number; // best single-set volume
  mostReps: number;
};

export type ExerciseStats = {
  sessions: ExerciseSession[]; // chronological, oldest → newest
  prs: ExercisePRs;
};

const num = (s: string) => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export const EMPTY_STATS: ExerciseStats = {
  sessions: [],
  prs: { heaviestWeight: 0, best1RM: 0, bestVolume: 0, bestSetVolume: 0, mostReps: 0 },
};

export const computeExerciseStats = (
  workouts: SavedWorkout[],
  exerciseName: string
): ExerciseStats => {
  const sessions: ExerciseSession[] = [];

  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.name === exerciseName);
    if (!ex) continue;

    const sets: ExerciseSet[] = [];
    let heaviestWeight = 0;
    let best1RM = 0;
    let volume = 0;
    let bestSetVolume = 0;
    let mostReps = 0;
    let totalReps = 0;

    for (const s of ex.sets) {
      const weight = num(s.weight);
      const reps = num(s.reps);
      if (weight <= 0 && reps <= 0) continue; // skip blank sets
      sets.push({ weight, reps });
      heaviestWeight = Math.max(heaviestWeight, weight);
      mostReps = Math.max(mostReps, reps);
      totalReps += reps;
      volume += weight * reps;
      bestSetVolume = Math.max(bestSetVolume, weight * reps);
      if (weight > 0 && reps > 0) best1RM = Math.max(best1RM, weight * (1 + reps / 30));
    }

    if (sets.length === 0) continue;
    sessions.push({
      date: w.date,
      sets,
      heaviestWeight,
      best1RM: Math.round(best1RM),
      volume: Math.round(volume),
      bestSetVolume: Math.round(bestSetVolume),
      mostReps,
      totalReps,
    });
  }

  sessions.sort((a, b) => a.date - b.date);

  const prs: ExercisePRs = {
    heaviestWeight: Math.max(0, ...sessions.map((s) => s.heaviestWeight)),
    best1RM: Math.max(0, ...sessions.map((s) => s.best1RM)),
    bestVolume: Math.max(0, ...sessions.map((s) => s.volume)),
    bestSetVolume: Math.max(0, ...sessions.map((s) => s.bestSetVolume)),
    mostReps: Math.max(0, ...sessions.map((s) => s.mostReps)),
  };

  return { sessions, prs };
};
