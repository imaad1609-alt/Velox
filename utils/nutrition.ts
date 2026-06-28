import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// ─── Food diary ───────────────────────────────────────────────────────────────
// One DiaryEntry = one food logged into a meal on a given day. Macros are
// DENORMALIZED (snapshotted from the catalog food and pre-multiplied by the
// chosen servings) — like SavedWorkout stores exercises by value — so editing
// the bundled catalog never rewrites a user's history, and day totals are a
// plain sum with no per-row math.

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export type DiaryEntry = {
  id?: string; // Firestore doc id; absent until saved
  day: string; // "YYYY-MM-DD" LOCAL date key (see dayKey)
  meal: MealType;
  foodId: string; // provenance only — the macros below are the source of truth
  name: string; // snapshot
  brand?: string; // snapshot
  servingSize: number; // snapshot of the food's single-serving size
  servingUnit: string; // snapshot
  servings: number; // user-chosen multiplier (e.g. 1.5)
  // Totals already multiplied by `servings`:
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  createdAt: number; // Date.now() ms — preserves insertion order within a meal
};

export type DiaryTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

// Local YYYY-MM-DD (NOT UTC — toISOString() would roll the day at the wrong
// boundary near midnight). Consistent with the dashboard's local-midnight logic.
export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// → users / {uid} / foodLog
const foodLogCollection = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return collection(db, "users", uid, "foodLog");
};

const foodLogDoc = (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return doc(db, "users", uid, "foodLog", id);
};

// Sum a day's (or meal's) entries into a single totals object.
export const sumTotals = (entries: DiaryEntry[]): DiaryTotals =>
  entries.reduce<DiaryTotals>(
    (t, e) => ({
      calories: t.calories + e.calories,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
      fiber: t.fiber + (e.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

// Live subscription for one day. Fires immediately with that day's entries, then
// again on any add/edit/delete. Returns an unsubscribe function. Sorted client-
// side by createdAt so a where("day") equality needs no composite index.
export const subscribeDiary = (
  day: string,
  onChange: (entries: DiaryEntry[]) => void,
  onError?: (e: Error) => void
) => {
  const q = query(foodLogCollection(), where("day", "==", day));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<DiaryEntry, "id">) }))
          .sort((a, b) => a.createdAt - b.createdAt)
      );
    },
    (e) => onError?.(e)
  );
};

// One-shot read for one day (used by the dashboard, which refreshes on focus).
export const getDiaryForDay = async (day: string): Promise<DiaryEntry[]> => {
  const q = query(foodLogCollection(), where("day", "==", day));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<DiaryEntry, "id">),
  }));
};

export const addDiaryEntry = async (
  entry: Omit<DiaryEntry, "id">
): Promise<void> => {
  await addDoc(foodLogCollection(), entry);
};

export const updateDiaryEntry = async (
  id: string,
  data: Partial<Omit<DiaryEntry, "id">>
): Promise<void> => {
  await updateDoc(foodLogDoc(id), data as Record<string, unknown>);
};

export const deleteDiaryEntry = async (id: string): Promise<void> => {
  await deleteDoc(foodLogDoc(id));
};
