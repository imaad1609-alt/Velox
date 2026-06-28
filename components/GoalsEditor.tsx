import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { NutritionGoals, saveGoals } from "../utils/goals";

// A single labelled numeric field. Defined at module level (not inside the
// editor) so the TextInput keeps focus across the parent's re-renders.
const Field = ({
  label,
  unit,
  value,
  onChangeText,
}: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (t: string) => void;
}) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        selectTextOnFocus
        placeholderTextColor={COLORS.textDim}
        maxLength={5}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  </View>
);

// Edit + persist the user's daily calorie/macro targets. Launched as a modal
// from the nutrition diary's calorie card.
export const GoalsEditor = ({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial: NutritionGoals;
  onClose: () => void;
  onSaved: (g: NutritionGoals) => void;
}) => {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed inputs from the current goals each time the editor opens.
  useEffect(() => {
    if (visible) {
      setCalories(String(initial.calories));
      setProtein(String(initial.protein));
      setCarbs(String(initial.carbs));
      setFat(String(initial.fat));
      setError(null);
    }
  }, [visible, initial]);

  // Empty / invalid → fall back to 0; clamp negatives to 0.
  const parse = (s: string) => {
    const n = parseFloat(s);
    return isNaN(n) || n < 0 ? 0 : n;
  };

  const p = parse(protein);
  const c = parse(carbs);
  const f = parse(fat);
  const macroKcal = Math.round(p * 4 + c * 4 + f * 9);

  const onSave = async () => {
    const next: Omit<NutritionGoals, "updatedAt"> = {
      calories: parse(calories),
      protein: p,
      carbs: c,
      fat: f,
    };
    setSaving(true);
    setError(null);
    try {
      await saveGoals(next);
      onSaved({ ...next, updatedAt: Date.now() });
      onClose();
    } catch {
      setError("Couldn't save goals. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Daily Goals</Text>

          <Field label="Calories" unit="kcal" value={calories} onChangeText={setCalories} />
          <Field label="Protein" unit="g" value={protein} onChangeText={setProtein} />
          <Field label="Carbs" unit="g" value={carbs} onChangeText={setCarbs} />
          <Field label="Fat" unit="g" value={fat} onChangeText={setFat} />

          <Text style={styles.sanity}>
            Macros add up to <Text style={styles.sanityNum}>{macroKcal.toLocaleString()}</Text> kcal
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.save} onPress={onSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  box: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  title: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: SPACING.md, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  fieldLabel: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 15 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, minWidth: 130 },
  input: { flex: 1, fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 16, paddingVertical: 10, textAlign: "right" },
  unit: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  sanity: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  sanityNum: { fontFamily: FONTS.monoBold, color: COLORS.text },
  error: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, marginTop: 10 },
  btnRow: { flexDirection: "row", gap: 12, marginTop: SPACING.lg },
  cancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  cancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  save: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 15 },
});
