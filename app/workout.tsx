import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Equipment,
  EQUIPMENT_TYPES,
  Exercise,
  EXERCISES,
  MUSCLE_COLORS,
  MUSCLE_GROUPS,
  MuscleGroup,
} from "../constants/exercises";

// ─── Types ────────────────────────────────────────────────────────────────────
type LoggedSet = { weight: string; reps: string; done: boolean };
type LoggedExercise = { exercise: Exercise; sets: LoggedSet[] };

// ─── Rest Timer ───────────────────────────────────────────────────────────────
const RestTimer = ({ onDone }: { onDone: () => void }) => {
  const [seconds, setSeconds] = useState(90);
  useEffect(() => {
    if (seconds <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone();
      return;
    }
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  return (
    <View style={styles.timerBox}>
      <Text style={styles.timerLabel}>REST TIMER</Text>
      <Text style={styles.timerCount}>{seconds}s</Text>
      <TouchableOpacity style={styles.timerSkip} onPress={onDone}>
        <Text style={styles.timerSkipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Muscle Chip ─────────────────────────────────────────────────────────────
const MuscleChip = ({ muscle }: { muscle: string }) => (
  <View style={[styles.chip, { backgroundColor: (MUSCLE_COLORS[muscle] || "#6C63FF") + "33", borderColor: MUSCLE_COLORS[muscle] || "#6C63FF" }]}>
    <Text style={[styles.chipText, { color: MUSCLE_COLORS[muscle] || "#6C63FF" }]}>{muscle}</Text>
  </View>
);

// ─── Exercise Picker ──────────────────────────────────────────────────────────
const ExercisePicker = ({ onSelect, onClose }: { onSelect: (e: Exercise) => void; onClose: () => void }) => {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "All">("All");
  const [equipment, setEquipment] = useState<Equipment | "All">("All");
  const [showMuscleFilter, setShowMuscleFilter] = useState(false);
  const [showEquipFilter, setShowEquipFilter] = useState(false);
  const [detail, setDetail] = useState<Exercise | null>(null);

  const filtered = EXERCISES.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscle === "All" || e.primaryMuscle === muscle;
    const matchEquip = equipment === "All" || e.equipment === equipment;
    return matchSearch && matchMuscle && matchEquip;
  });

  return (
    <View style={styles.pickerContainer}>
      {/* Header */}
      <View style={styles.pickerHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.pickerCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>Exercise Library</Text>
        <Text style={styles.pickerCount}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search exercises..."
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, muscle !== "All" && styles.filterBtnActive]}
          onPress={() => setShowMuscleFilter(true)}
        >
          <Text style={[styles.filterBtnText, muscle !== "All" && styles.filterBtnTextActive]}>
            {muscle === "All" ? "Muscle" : muscle} ▾
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, equipment !== "All" && styles.filterBtnActive]}
          onPress={() => setShowEquipFilter(true)}
        >
          <Text style={[styles.filterBtnText, equipment !== "All" && styles.filterBtnTextActive]}>
            {equipment === "All" ? "Equipment" : equipment} ▾
          </Text>
        </TouchableOpacity>
        {(muscle !== "All" || equipment !== "All") && (
          <TouchableOpacity onPress={() => { setMuscle("All"); setEquipment("All"); }}>
            <Text style={styles.clearFilter}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.exerciseRow} onPress={() => setDetail(item)}>
            <View style={[styles.colorBar, { backgroundColor: MUSCLE_COLORS[item.primaryMuscle] || "#6C63FF" }]} />
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <View style={styles.chipRow}>
                <MuscleChip muscle={item.primaryMuscle} />
                {item.secondaryMuscles.slice(0, 2).map((m) => <MuscleChip key={m} muscle={m} />)}
                <View style={styles.equipChip}>
                  <Text style={styles.equipChipText}>{item.equipment}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.diffDot, { backgroundColor: item.difficulty === "Beginner" ? "#00C9A7" : item.difficulty === "Intermediate" ? "#FF9F43" : "#FF6B6B" }]} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Muscle filter sheet */}
      <Modal visible={showMuscleFilter} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowMuscleFilter(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter by Muscle</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setMuscle("All"); setShowMuscleFilter(false); }}>
              <Text style={[styles.sheetOptionText, muscle === "All" && styles.sheetOptionActive]}>All Muscles</Text>
            </TouchableOpacity>
            {MUSCLE_GROUPS.map((m) => (
              <TouchableOpacity key={m} style={styles.sheetOption} onPress={() => { setMuscle(m); setShowMuscleFilter(false); }}>
                <View style={[styles.filterDot, { backgroundColor: MUSCLE_COLORS[m] }]} />
                <Text style={[styles.sheetOptionText, muscle === m && styles.sheetOptionActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Equipment filter sheet */}
      <Modal visible={showEquipFilter} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowEquipFilter(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter by Equipment</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setEquipment("All"); setShowEquipFilter(false); }}>
              <Text style={[styles.sheetOptionText, equipment === "All" && styles.sheetOptionActive]}>All Equipment</Text>
            </TouchableOpacity>
            {EQUIPMENT_TYPES.map((eq) => (
              <TouchableOpacity key={eq} style={styles.sheetOption} onPress={() => { setEquipment(eq); setShowEquipFilter(false); }}>
                <Text style={[styles.sheetOptionText, equipment === eq && styles.sheetOptionActive]}>{eq}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exercise detail */}
      <Modal visible={!!detail} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {detail && (
              <>
                <View style={[styles.detailBar, { backgroundColor: MUSCLE_COLORS[detail.primaryMuscle] }]} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailName}>{detail.name}</Text>

                  <Text style={styles.detailLabel}>PRIMARY MUSCLE</Text>
                  <MuscleChip muscle={detail.primaryMuscle} />

                  {detail.secondaryMuscles.length > 0 && (
                    <>
                      <Text style={[styles.detailLabel, { marginTop: 12 }]}>SECONDARY</Text>
                      <View style={styles.chipRow}>{detail.secondaryMuscles.map((m) => <MuscleChip key={m} muscle={m} />)}</View>
                    </>
                  )}

                  {detail.tertiaryMuscles.length > 0 && (
                    <>
                      <Text style={[styles.detailLabel, { marginTop: 12 }]}>ALSO WORKS</Text>
                      <View style={styles.chipRow}>{detail.tertiaryMuscles.map((m) => <MuscleChip key={m} muscle={m} />)}</View>
                    </>
                  )}

                  <View style={styles.metaRow}>
                    <View>
                      <Text style={styles.detailLabel}>EQUIPMENT</Text>
                      <Text style={styles.metaValue}>{detail.equipment}</Text>
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>DIFFICULTY</Text>
                      <Text style={[styles.metaValue, { color: detail.difficulty === "Beginner" ? "#00C9A7" : detail.difficulty === "Intermediate" ? "#FF9F43" : "#FF6B6B" }]}>{detail.difficulty}</Text>
                    </View>
                  </View>

                  <Text style={[styles.detailLabel, { marginTop: 16 }]}>HOW TO PERFORM</Text>
                  {detail.instructions.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                  <View style={{ height: 20 }} />
                </ScrollView>

                <TouchableOpacity style={styles.addConfirmBtn} onPress={() => { onSelect(detail); setDetail(null); }}>
                  <LinearGradient colors={["#6C63FF", "#4ECDC4"]} style={styles.addConfirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.addConfirmText}>+ Add to Workout</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => setDetail(null)}>
                  <Text style={styles.backBtnText}>Back to Library</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Workout() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const [isWorkingOut, setIsWorkingOut] = useState(false);
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const workoutName = "My Workout";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const addExercise = (e: Exercise) => {
    setExercises((prev) => [...prev, { exercise: e, sets: [{ weight: "", reps: "", done: false }] }]);
    setShowPicker(false);
  };

  const addSet = (i: number) => {
    setExercises((prev) => { const u = [...prev]; u[i].sets.push({ weight: "", reps: "", done: false }); return u; });
  };

  const updateSet = (ei: number, si: number, field: "weight" | "reps", val: string) => {
    setExercises((prev) => { const u = [...prev]; u[ei].sets[si][field] = val; return u; });
  };

  const toggleSet = (ei: number, si: number) => {
    setExercises((prev) => { const u = [...prev]; u[ei].sets[si].done = !u[ei].sets[si].done; return u; });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimer(true);
  };

  const finishWorkout = () => {
    Alert.alert("Finish Workout?", `${exercises.length} exercises logged.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Finish", onPress: () => { setIsWorkingOut(false); setExercises([]); } },
    ]);
  };

  if (showPicker) return <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />;

  if (!isWorkingOut) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Workout</Text>
              <Text style={styles.headerSub}>Ready to train?</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={() => setIsWorkingOut(true)}>
            <LinearGradient colors={["#6C63FF", "#4ECDC4"]} style={styles.startBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.startBtnText}>+ Start Empty Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      {showTimer && <RestTimer onDone={() => setShowTimer(false)} />}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{workoutName}</Text>
          <TouchableOpacity onPress={finishWorkout}>
            <Text style={styles.finishBtn}>Finish</Text>
          </TouchableOpacity>
        </View>
        {exercises.map((item, ei) => (
          <LinearGradient key={ei} colors={["#1A1A2E", "#16213E"]} style={styles.exerciseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[item.exercise.primaryMuscle] || "#6C63FF" }]} />
              <Text style={styles.exerciseTitle}>{item.exercise.name}</Text>
            </View>
            <Text style={styles.exerciseSub}>{item.exercise.primaryMuscle} · {item.exercise.equipment}</Text>
            <View style={styles.setHeader}>
              <Text style={[styles.setCol, { flex: 0.5 }]}>Set</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>lbs</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.setCol, { flex: 0.5 }]}>✓</Text>
            </View>
            {item.sets.map((set, si) => (
              <View key={si} style={styles.setRow}>
                <Text style={[styles.setNum, { flex: 0.5 }]}>{si + 1}</Text>
                <TextInput style={[styles.setInput, { flex: 1 }, set.done && styles.setDone]} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={set.weight} onChangeText={(v) => updateSet(ei, si, "weight", v)} editable={!set.done} />
                <TextInput style={[styles.setInput, { flex: 1 }, set.done && styles.setDone]} placeholder="0" placeholderTextColor="#555" keyboardType="numeric" value={set.reps} onChangeText={(v) => updateSet(ei, si, "reps", v)} editable={!set.done} />
                <TouchableOpacity style={[styles.doneBtn, { flex: 0.5 }, set.done && styles.doneBtnActive]} onPress={() => toggleSet(ei, si)}>
                  <Text style={styles.doneBtnText}>{set.done ? "✓" : "○"}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ei)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </LinearGradient>
        ))}
        <TouchableOpacity style={styles.addExBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#FFF" },
  headerSub: { fontSize: 14, color: "#888", marginTop: 2 },
  finishBtn: { color: "#00C9A7", fontSize: 16, fontWeight: "600" },
  startBtn: { marginHorizontal: 16, marginBottom: 24, borderRadius: 16, overflow: "hidden" },
  startBtnGradient: { padding: 18, alignItems: "center" },
  startBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  exerciseCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#2A2A4A" },
  exDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  exerciseTitle: { fontSize: 17, fontWeight: "bold", color: "#FFF" },
  exerciseSub: { fontSize: 12, color: "#888", marginBottom: 14, marginLeft: 20 },
  setHeader: { flexDirection: "row", marginBottom: 8 },
  setCol: { fontSize: 11, color: "#666", fontWeight: "700", textTransform: "uppercase", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setNum: { color: "#888", fontSize: 15, textAlign: "center" },
  setInput: { backgroundColor: "#0D0D0D", color: "#FFF", borderRadius: 8, padding: 10, marginHorizontal: 3, fontSize: 15, textAlign: "center" },
  setDone: { backgroundColor: "#00C9A720", color: "#00C9A7" },
  doneBtn: { height: 38, borderRadius: 8, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" },
  doneBtnActive: { backgroundColor: "#00C9A7" },
  doneBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  addSetBtn: { marginTop: 8, alignItems: "center", padding: 8 },
  addSetText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
  addExBtn: { marginHorizontal: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#2A2A4A", alignItems: "center" },
  addExText: { color: "#6C63FF", fontSize: 16, fontWeight: "600" },
  timerBox: { backgroundColor: "#1A1A2E", margin: 16, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#6C63FF" },
  timerLabel: { color: "#888", fontSize: 11, letterSpacing: 1.5 },
  timerCount: { color: "#6C63FF", fontSize: 52, fontWeight: "bold" },
  timerSkip: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#6C63FF" },
  timerSkipText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
  pickerContainer: { flex: 1, backgroundColor: "#0D0D0D" },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 60, borderBottomWidth: 1, borderColor: "#1A1A2E" },
  pickerCancel: { color: "#6C63FF", fontSize: 16 },
  pickerTitle: { color: "#FFF", fontSize: 17, fontWeight: "bold" },
  pickerCount: { color: "#888", fontSize: 14 },
  searchInput: { margin: 16, backgroundColor: "#1A1A2E", color: "#FFF", borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: "#2A2A4A" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8, alignItems: "center" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#2A2A4A", backgroundColor: "#1A1A2E" },
  filterBtnActive: { borderColor: "#6C63FF", backgroundColor: "#6C63FF22" },
  filterBtnText: { color: "#888", fontSize: 13 },
  filterBtnTextActive: { color: "#6C63FF" },
  clearFilter: { color: "#FF6B6B", fontSize: 13, fontWeight: "600" },
  exerciseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingLeft: 0 },
  colorBar: { width: 4, alignSelf: "stretch", borderRadius: 2, marginLeft: 16 },
  exerciseName: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "600" },
  equipChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: "#2A2A4A" },
  equipChipText: { fontSize: 11, color: "#888" },
  diffDot: { width: 8, height: 8, borderRadius: 4, marginRight: 16 },
  separator: { height: 1, backgroundColor: "#1A1A2E", marginLeft: 20 },
  overlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#1A1A2E", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48, maxHeight: "80%" },
  sheetTitle: { color: "#FFF", fontSize: 17, fontWeight: "bold", marginBottom: 16 },
  sheetOption: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderColor: "#2A2A4A" },
  sheetOptionText: { color: "#888", fontSize: 15 },
  sheetOptionActive: { color: "#6C63FF", fontWeight: "bold" },
  filterDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  detailOverlay: { flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: "#0D0D0D", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 16, maxHeight: "92%" },
  detailBar: { height: 4, borderRadius: 2, marginBottom: 16 },
  detailName: { color: "#FFF", fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  detailLabel: { color: "#888", fontSize: 11, letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 32, marginTop: 16, padding: 16, backgroundColor: "#1A1A2E", borderRadius: 12 },
  metaValue: { color: "#FFF", fontSize: 15, fontWeight: "bold", marginTop: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#6C63FF", alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 },
  stepNumText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  stepText: { color: "#CCC", fontSize: 14, flex: 1, lineHeight: 20 },
  addConfirmBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden" },
  addConfirmGradient: { padding: 16, alignItems: "center" },
  addConfirmText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  backBtn: { padding: 14, alignItems: "center" },
  backBtnText: { color: "#888", fontSize: 14 },
});
