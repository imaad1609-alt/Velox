import { SetType } from "../contexts/WorkoutContext";

// Shared visual treatment for set types (Hevy-style). Used by the active logger
// and the workout-history detail view so badges look identical everywhere.
// Normal sets just show the set number; the others get a colored letter badge.
export const SET_TYPE_ORDER: SetType[] = ["normal", "warmup", "drop", "failure"];

export const SET_TYPE_META: Record<SetType, { label: string; color: string }> = {
  normal: { label: "", color: "#888" },
  warmup: { label: "W", color: "#FF9F43" },
  drop: { label: "D", color: "#54A0FF" },
  failure: { label: "F", color: "#FF6B6B" },
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "Normal set",
  warmup: "Warm-up",
  drop: "Drop set",
  failure: "To failure",
};
