import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  Food,
  FOOD_CATEGORIES,
  FoodCategory,
  searchFoods,
} from "../constants/foods";
import { enter } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { PressableScale } from "./PressableScale";
import {
  addDiaryEntry,
  MEAL_LABELS,
  MealType,
} from "../utils/nutrition";

const QUICK_SERVINGS = [0.5, 1, 2];

// Parse a servings input → a positive number; empty/invalid → 1.
const parseServings = (s: string) => {
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? 1 : n;
};

const round = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

// ─── Food Picker ──────────────────────────────────────────────────────────────
// Full-screen catalog search + a quantity sheet. Mirrors ExercisePicker. On
// confirm it writes a denormalized DiaryEntry for the given day + meal, then the
// diary screen's live subscription updates totals automatically.
export const FoodPicker = ({
  meal,
  day,
  onClose,
}: {
  meal: MealType;
  day: string;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FoodCategory | "All">("All");
  const [selected, setSelected] = useState<Food | null>(null);
  const [servingsText, setServingsText] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => searchFoods(search, category),
    [search, category]
  );

  const servings = parseServings(servingsText);

  const openFood = (food: Food) => {
    setSelected(food);
    setServingsText("1");
    setError(null);
  };

  const confirmAdd = async () => {
    if (!selected) return;
    const s = servings;
    setSaving(true);
    setError(null);
    try {
      await addDiaryEntry({
        day,
        meal,
        foodId: selected.id,
        name: selected.name,
        ...(selected.brand ? { brand: selected.brand } : {}),
        servingSize: selected.servingSize,
        servingUnit: selected.servingUnit,
        servings: s,
        calories: round(selected.calories * s),
        protein: round1(selected.protein * s),
        carbs: round1(selected.carbs * s),
        fat: round1(selected.fat * s),
        ...(selected.fiber != null ? { fiber: round1(selected.fiber * s) } : {}),
        createdAt: Date.now(),
      });
      setSelected(null);
      onClose();
    } catch {
      setError("Couldn't add this food. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add to {MEAL_LABELS[meal]}</Text>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search foods..."
        placeholderTextColor={COLORS.textDim}
        value={search}
        onChangeText={setSearch}
      />

      {/* Category chips */}
      <View style={styles.chipScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["All", ...FOOD_CATEGORIES] as (FoodCategory | "All")[]}
          keyExtractor={(c) => c}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8 }}
          renderItem={({ item }) => {
            const active = category === item;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Food list */}
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Animated.View entering={enter()}>
            <TouchableOpacity style={styles.foodRow} onPress={() => openFood(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodSub}>
                  {item.brand ? `${item.brand} · ` : ""}
                  {item.servingSize} {item.servingUnit}
                </Text>
              </View>
              <View style={styles.macroChips}>
                <Text style={styles.kcal}>{item.calories} kcal</Text>
                <Text style={styles.macroMini}>
                  P{round(item.protein)} · C{round(item.carbs)} · F{round(item.fat)}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No foods match your search.</Text>
          </View>
        }
      />

      {/* Quantity sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            {selected && (
              <>
                <Text style={styles.sheetName}>{selected.name}</Text>
                <Text style={styles.sheetSub}>
                  Per serving: {selected.servingSize} {selected.servingUnit} ·{" "}
                  {selected.calories} kcal
                </Text>

                <Text style={styles.fieldLabel}>Servings</Text>
                <View style={styles.servingRow}>
                  <TextInput
                    style={styles.servingInput}
                    value={servingsText}
                    onChangeText={setServingsText}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    maxLength={5}
                  />
                  <View style={styles.quickRow}>
                    {QUICK_SERVINGS.map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[styles.quickBtn, servings === q && styles.quickBtnActive]}
                        onPress={() => setServingsText(String(q))}
                      >
                        <Text style={[styles.quickText, servings === q && styles.quickTextActive]}>
                          {q}×
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Live preview */}
                <View style={styles.preview}>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewNum}>{round(selected.calories * servings)}</Text>
                    <Text style={styles.previewLabel}>KCAL</Text>
                  </View>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewNum}>{round1(selected.protein * servings)}g</Text>
                    <Text style={styles.previewLabel}>PROTEIN</Text>
                  </View>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewNum}>{round1(selected.carbs * servings)}g</Text>
                    <Text style={styles.previewLabel}>CARBS</Text>
                  </View>
                  <View style={styles.previewItem}>
                    <Text style={styles.previewNum}>{round1(selected.fat * servings)}g</Text>
                    <Text style={styles.previewLabel}>FAT</Text>
                  </View>
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.sheetBtnRow}>
                  <TouchableOpacity style={styles.sheetCancel} onPress={() => setSelected(null)} disabled={saving}>
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <PressableScale style={styles.addBtn} onPress={confirmAdd} disabled={saving} haptic>
                    {saving ? (
                      <ActivityIndicator color={COLORS.onPrimary} />
                    ) : (
                      <Text style={styles.addBtnText}>Add to {MEAL_LABELS[meal]}</Text>
                    )}
                  </PressableScale>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingTop: 60, borderBottomWidth: 1, borderColor: COLORS.border },
  cancel: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 16 },
  title: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.4 },
  count: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 14 },
  searchInput: { margin: SPACING.md, marginBottom: SPACING.sm, backgroundColor: COLORS.surface1, color: COLORS.text, borderRadius: RADIUS.md, padding: 14, fontSize: 15, fontFamily: FONTS.body, borderWidth: 1, borderColor: COLORS.border },
  chipScroll: { marginBottom: SPACING.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1 },
  chipActive: { borderColor: COLORS.primary, backgroundColor: "rgba(204, 255, 0, 0.12)" },
  chipText: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  chipTextActive: { color: COLORS.primary },
  foodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: SPACING.md, gap: 12 },
  foodName: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 15, marginBottom: 4 },
  foodSub: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.3 },
  macroChips: { alignItems: "flex-end" },
  kcal: { fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 14 },
  macroMini: { fontFamily: FONTS.mono, color: COLORS.textDim, fontSize: 10, marginTop: 3 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.md },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyText: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, textAlign: "center" },

  sheetOverlay: { flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: COLORS.borderStrong },
  sheetName: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 20, textTransform: "uppercase", letterSpacing: 0.3 },
  sheetSub: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, marginTop: 6, marginBottom: SPACING.lg },
  fieldLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  servingRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: SPACING.lg },
  servingInput: { width: 80, backgroundColor: COLORS.surface3, color: COLORS.text, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, paddingHorizontal: 14, fontFamily: FONTS.monoBold, fontSize: 18, textAlign: "center" },
  quickRow: { flexDirection: "row", gap: 8, flex: 1 },
  quickBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1, alignItems: "center" },
  quickBtnActive: { borderColor: COLORS.primary, backgroundColor: "rgba(204, 255, 0, 0.12)" },
  quickText: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 13 },
  quickTextActive: { color: COLORS.primary },
  preview: { flexDirection: "row", justifyContent: "space-between", backgroundColor: COLORS.surface1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 14, paddingHorizontal: 12 },
  previewItem: { flex: 1, alignItems: "center" },
  previewNum: { fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 16 },
  previewLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 9, marginTop: 4, letterSpacing: 0.5 },
  error: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, marginTop: 12 },
  sheetBtnRow: { flexDirection: "row", gap: 12, marginTop: SPACING.lg },
  sheetCancel: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  sheetCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  addBtn: { flex: 1, paddingVertical: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  addBtnText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 15 },
});
