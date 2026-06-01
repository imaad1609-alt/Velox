import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// The shape of one finished workout we save to the cloud
export type SavedWorkout = {
  id?: string;
  name: string;
  durationSeconds: number;
  date: number; // stored as a timestamp (milliseconds since 1970)
  exercises: {
    name: string;
    primaryMuscle: string;
    sets: { weight: string; reps: string }[];
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
