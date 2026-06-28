import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// ─── Nutrition goals ──────────────────────────────────────────────────────────
// A single per-user document holding daily calorie + macro targets. Read by both
// the nutrition diary and the dashboard. Defaults match the values the dashboard
// shipped with, so behaviour is unchanged until the user edits them.

export type NutritionGoals = {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  updatedAt: number; // Date.now() ms
};

export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fat: 80,
  updatedAt: 0,
};

// → users / {uid} / profile / nutritionGoals  (a single document, not a collection)
const goalsDoc = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return doc(db, "users", uid, "profile", "nutritionGoals");
};

// One-shot read. Missing doc → DEFAULT_GOALS. Stored fields are merged over the
// defaults so a goal added in a future version still parses cleanly.
export const getGoals = async (): Promise<NutritionGoals> => {
  const snap = await getDoc(goalsDoc());
  return snap.exists()
    ? { ...DEFAULT_GOALS, ...(snap.data() as Partial<NutritionGoals>) }
    : DEFAULT_GOALS;
};

// Create-or-replace the goals doc, stamping updatedAt.
export const saveGoals = async (
  goals: Omit<NutritionGoals, "updatedAt">
): Promise<void> => {
  await setDoc(goalsDoc(), { ...goals, updatedAt: Date.now() });
};
