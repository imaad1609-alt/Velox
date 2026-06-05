import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// The shape of one finished workout we save to the cloud.
// Newer fields are optional so older documents (saved before they existed)
// still parse cleanly.
export type SavedSet = {
  weight: string;
  reps: string;
  type?: "normal" | "warmup" | "drop" | "failure";
  rpe?: string;
};

export type SavedWorkout = {
  id?: string;
  name: string;
  durationSeconds: number;
  date: number; // stored as a timestamp (milliseconds since 1970)
  // Estimated active energy for this session. Read by the dashboard / nutrition
  // side — the workout section is the only place that writes it.
  caloriesBurned?: number;
  exercises: {
    name: string;
    primaryMuscle: string;
    note?: string;
    sets: SavedSet[];
  }[];
};

// Helper: the path to THIS user's workouts folder in Firestore
// → users / {userId} / workouts
const workoutsCollection = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return collection(db, "users", uid, "workouts");
};

// Save a finished workout to the cloud
export const saveWorkout = async (workout: SavedWorkout) => {
  await addDoc(workoutsCollection(), workout);
};

// Get all of this user's workouts, newest first
export const getWorkouts = async (): Promise<SavedWorkout[]> => {
  const q = query(workoutsCollection(), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as SavedWorkout),
  }));
};

// For the active logger's "previous performance" hints: a map of exercise name
// → the sets logged the last time that exercise was done. Because getWorkouts
// returns newest-first, the first time we see an exercise is its most recent
// session.
export type PreviousPerformance = Record<string, SavedSet[]>;

export const getPreviousPerformance = async (): Promise<PreviousPerformance> => {
  const workouts = await getWorkouts();
  const map: PreviousPerformance = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (!map[ex.name]) map[ex.name] = ex.sets;
    }
  }
  return map;
};
