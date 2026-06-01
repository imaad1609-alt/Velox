import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "velox_workout_templates";

export type WorkoutTemplate = {
  id: string;
  name: string;
  exerciseIds: string[];
  exerciseNames: string[];
  createdAt: string;
};

// In-memory fallback
let _memTemplates: WorkoutTemplate[] = [];

export const getTemplates = async (): Promise<WorkoutTemplate[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      _memTemplates = JSON.parse(raw);
      return _memTemplates;
    }
    return _memTemplates;
  } catch {
    return _memTemplates;
  }
};

export const saveTemplate = async (template: WorkoutTemplate): Promise<void> => {
  try {
    const existing = await getTemplates();
    const updated = [...existing, template];
    _memTemplates = updated;
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    _memTemplates = [..._memTemplates, template];
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    const existing = await getTemplates();
    const updated = existing.filter((t) => t.id !== id);
    _memTemplates = updated;
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    _memTemplates = _memTemplates.filter((t) => t.id !== id);
  }
};
