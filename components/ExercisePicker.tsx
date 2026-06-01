import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
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
import { MuscleMap } from "./MuscleMap";

// ─── Muscle Chip ─────────────────────────────────────────────────────────────
export const MuscleChip = ({ muscle }: { muscle: string }) => (
  <View style={[styles.chip, { backgroundColor: (MUSCLE_COLORS[muscle] || "#6C63FF") + "33", borderColor: MUSCLE_COLORS[muscle] || "#6C63FF" }]}>
    <Text style={[styles.chipText, { color: MUSCLE_COLORS[muscle] || "#6C63FF" }]}>{muscle}</Text>
  </View>
);

// ─── Exercise Picker ──────────────────────────────────────────────────────────
// A full-screen exercise library with search + filters. Calls onSelect with the
// chosen exercise. Reused by both the workout logger and the routine editor.
export const ExercisePicker = ({ onSelect, onClose }: { onSelect: (e: Exercise) => void; onClose: () => void }) => {
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

                  <Text style={styles.detailLabel}>TARGET MUSCLES</Text>
                  <View style={styles.muscleMapBox}>
                    <MuscleMap
                      primary={detail.primaryMuscle}
                      secondary={detail.secondaryMuscles}
                      tertiary={detail.tertiaryMuscles}
                    />
                  </View>

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

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "600" },
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
  muscleMapBox: { backgroundColor: "#1A1A2E", borderRadius: 12, paddingVertical: 16, marginBottom: 16 },
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
