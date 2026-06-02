import { useState } from "react";
import {
  FlatList,
  Modal,
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
  MUSCLE_COLORS,
  MUSCLE_GROUPS,
  MuscleGroup,
} from "../constants/exercises";
import { useExercises } from "../contexts/ExercisesProvider";
import { ExerciseDetail } from "./ExerciseDetail";
import { MuscleChip } from "./MuscleChip";

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
  const catalog = useExercises();

  const filtered = catalog.filter((e) => {
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
        style={{ flex: 1 }}
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
              <ExerciseDetail
                exercise={detail}
                onAdd={() => { onSelect(detail); setDetail(null); }}
                onClose={() => setDetail(null)}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
  detailSheet: { backgroundColor: "#0D0D0D", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 16, height: "92%" },
});
