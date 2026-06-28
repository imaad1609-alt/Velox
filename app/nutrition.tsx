import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { FoodPicker } from "../components/FoodPicker";
import { GoalsEditor } from "../components/GoalsEditor";
import { MacroBar } from "../components/MacroBar";
import { enterDown } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { DEFAULT_GOALS, getGoals, NutritionGoals } from "../utils/goals";
import {
  DiaryEntry,
  dayKey,
  deleteDiaryEntry,
  MEAL_LABELS,
  MEALS,
  MealType,
  subscribeDiary,
  sumTotals,
} from "../utils/nutrition";

// ── Date label: "Today" / "Yesterday" / "Tomorrow" / weekday + date ──────────
const dateLabel = (d: Date) => {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  if (days === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

// ── A single logged food row inside a meal ───────────────────────────────────
const EntryRow = ({
  entry,
  onDelete,
}: {
  entry: DiaryEntry;
  onDelete: () => void;
}) => (
  <View style={styles.entryRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
      <Text style={styles.entrySub}>
        {entry.servings} × {entry.servingSize} {entry.servingUnit} · P{Math.round(entry.protein)} C{Math.round(entry.carbs)} F{Math.round(entry.fat)}
      </Text>
    </View>
    <Text style={styles.entryKcal}>{Math.round(entry.calories)}</Text>
    <TouchableOpacity style={styles.trashBtn} onPress={onDelete} hitSlop={8}>
      <Ionicons name="trash-outline" size={16} color={COLORS.textDim} />
    </TouchableOpacity>
  </View>
);

// ── One meal section (Breakfast / Lunch / Dinner / Snacks) ───────────────────
const MealSection = ({
  meal,
  entries,
  onAdd,
  onDelete,
}: {
  meal: MealType;
  entries: DiaryEntry[];
  onAdd: () => void;
  onDelete: (entry: DiaryEntry) => void;
}) => {
  const kcal = Math.round(sumTotals(entries).calories);
  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealName}>{MEAL_LABELS[meal]}</Text>
        <View style={styles.mealHeaderRight}>
          <Text style={styles.mealKcal}>{kcal} kcal</Text>
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} hitSlop={8}>
            <Ionicons name="add" size={18} color={COLORS.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      {entries.length === 0 ? (
        <Text style={styles.emptyMeal}>No items yet</Text>
      ) : (
        entries.map((e) => (
          <EntryRow key={e.id} entry={e} onDelete={() => onDelete(e)} />
        ))
      )}
    </View>
  );
};

export default function Nutrition() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<MealType | null>(null);
  const [showGoals, setShowGoals] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DiaryEntry | null>(null);

  const day = useMemo(() => dayKey(selectedDate), [selectedDate]);

  // Live subscription to the selected day's entries. Re-subscribes on date change.
  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeDiary(
      day,
      (next) => { setEntries(next); setLoading(false); },
      () => { setError("Couldn't load your food log."); setLoading(false); }
    );
    return unsub;
  }, [day]);

  // Goals (one-shot). On error keep defaults — never block the screen.
  useEffect(() => {
    getGoals().then(setGoals).catch(() => setGoals(DEFAULT_GOALS));
  }, []);

  const totals = useMemo(() => sumTotals(entries), [entries]);
  const eaten = Math.round(totals.calories);
  const percent = goals.calories > 0 ? Math.round((eaten / goals.calories) * 100) : 0;
  const remaining = goals.calories - eaten;

  const confirmDelete = async () => {
    if (!pendingDelete?.id) { setPendingDelete(null); return; }
    try {
      await deleteDiaryEntry(pendingDelete.id);
    } catch {
      // The subscription will keep the entry if the delete failed; surface softly.
      setError("Couldn't remove that entry.");
    } finally {
      setPendingDelete(null);
    }
  };

  // Food picker takes over the whole screen (mirrors the workout logger).
  if (picker) {
    return <FoodPicker meal={picker} day={day} onClose={() => setPicker(null)} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Date navigator */}
        <Animated.View style={styles.dateNav} entering={enterDown(0)}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => setSelectedDate((d) => addDays(d, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDate(new Date())} activeOpacity={0.7}>
            <Text style={styles.dateLabel}>{dateLabel(selectedDate)}</Text>
            <Text style={styles.dateTapHint}>Tap for today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateArrow} onPress={() => setSelectedDate((d) => addDays(d, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Calorie summary */}
            <Animated.View entering={enterDown(1)}>
              <LinearGradient colors={[COLORS.surface1, "#161618"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.calHeader}>
                  <Text style={styles.cardTitle}>Calories</Text>
                  <TouchableOpacity style={styles.editGoals} onPress={() => setShowGoals(true)} hitSlop={8}>
                    <Ionicons name="create-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.editGoalsText}>Goals</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.ringContainer}>
                  <View style={styles.ringOuter}>
                    <View style={styles.ringInner}>
                      <Text style={styles.ringNumber}>{eaten.toLocaleString()}</Text>
                      <Text style={styles.ringLabel}>KCAL EATEN</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{goals.calories.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Goal</Text>
                  </View>
                  <View style={[styles.stat, styles.statMiddle]}>
                    <Text style={[styles.statNum, { color: COLORS.primary }]}>{percent}%</Text>
                    <Text style={styles.statLabel}>Done</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{remaining.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Remaining</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Macros */}
            <Animated.View entering={enterDown(2)}>
              <LinearGradient colors={[COLORS.surface1, "#161618"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.cardTitle}>Macros</Text>
                <MacroBar name="Protein" current={totals.protein} goal={goals.protein} delay={100} />
                <MacroBar name="Carbs" current={totals.carbs} goal={goals.carbs} delay={200} />
                <MacroBar name="Fat" current={totals.fat} goal={goals.fat} delay={300} />
              </LinearGradient>
            </Animated.View>

            {/* Meal sections */}
            {MEALS.map((meal, i) => (
              <Animated.View key={meal} entering={enterDown(3 + i)}>
                <MealSection
                  meal={meal}
                  entries={entries.filter((e) => e.meal === meal)}
                  onAdd={() => setPicker(meal)}
                  onDelete={(e) => setPendingDelete(e)}
                />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Goals editor */}
      <GoalsEditor
        visible={showGoals}
        initial={goals}
        onClose={() => setShowGoals(false)}
        onSaved={setGoals}
      />

      {/* Delete confirm */}
      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => setPendingDelete(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Remove entry?</Text>
            <Text style={styles.confirmMsg}>{pendingDelete?.name} will be removed from this day.</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setPendingDelete(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelete} onPress={confirmDelete}>
                <Text style={styles.confirmDeleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.base },
  container: { flex: 1, backgroundColor: COLORS.base },

  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  dateArrow: { width: 40, height: 40, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface1 },
  dateLabel: { fontFamily: FONTS.display, fontSize: 26, color: COLORS.text, textTransform: "uppercase", letterSpacing: -0.5, textAlign: "center" },
  dateTapHint: { fontFamily: FONTS.mono, fontSize: 9, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginTop: 2 },

  loadingBox: { paddingVertical: 64, alignItems: "center" },
  errorText: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, marginHorizontal: SPACING.md, marginBottom: SPACING.sm },

  card: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  calHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  editGoals: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  editGoalsText: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },

  ringContainer: { alignItems: "center", marginBottom: 16 },
  ringOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 12, borderColor: COLORS.primary, justifyContent: "center", alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  ringInner: { alignItems: "center" },
  ringNumber: { fontFamily: FONTS.monoBold, fontSize: 28, color: COLORS.text },
  ringLabel: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, marginTop: 4, letterSpacing: 1 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1, alignItems: "center" },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  statNum: { fontFamily: FONTS.monoBold, fontSize: 18, color: COLORS.text },
  statLabel: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },

  mealCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1 },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  mealName: { fontFamily: FONTS.heading, fontSize: 16, color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.4 },
  mealHeaderRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealKcal: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textMuted },
  addBtn: { width: 30, height: 30, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  emptyMeal: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textDim, fontStyle: "italic" },

  entryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: COLORS.border },
  entryName: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.text },
  entrySub: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, marginTop: 3, letterSpacing: 0.3 },
  entryKcal: { fontFamily: FONTS.monoBold, fontSize: 14, color: COLORS.text },
  trashBtn: { padding: 4 },

  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  confirmTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  confirmMsg: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15, lineHeight: 21 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: SPACING.lg },
  confirmCancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  confirmCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  confirmDelete: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: "center" },
  confirmDeleteText: { fontFamily: FONTS.bodyBold, color: "#FFFFFF", fontSize: 15 },
});
