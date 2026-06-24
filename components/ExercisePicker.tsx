import { useMemo, useState } from "react";
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
import Animated from "react-native-reanimated";
import { enter } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { useExercises } from "../contexts/ExercisesProvider";
import { ExerciseDetail } from "./ExerciseDetail";
import { MuscleChip } from "./MuscleChip";

// ─── Exercise Picker ──────────────────────────────────────────────────────────
// A full-screen exercise library with search + filters. Calls onSelect with the
// chosen exercise. Reused by both the workout logger and the routine editor.
export const ExercisePicker = ({
  onSelect,
  onClose,
  browse = false,
}: {
  onSelect?: (e: Exercise) => void;
  onClose: () => void;
  // Browse mode (Explore): just view the library, no selecting/adding.
  browse?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "All">("All");
  const [equipment, setEquipment] = useState<Equipment | "All">("All");
  const [showMuscleFilter, setShowMuscleFilter] = useState(false);
  const [showEquipFilter, setShowEquipFilter] = useState(false);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const catalog = useExercises();

  const filtered = useMemo(
    () =>
      catalog.filter((e) => {
        const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
        const matchMuscle = muscle === "All" || e.primaryMuscle === muscle;
        const matchEquip = equipment === "All" || e.equipment === equipment;
        return matchSearch && matchMuscle && matchEquip;
      }),
    [catalog, search, muscle, equipment]
  );

  return (
    <View style={styles.pickerContainer}>
      {/* Header */}
      <View style={styles.pickerHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.pickerCancel}>{browse ? "Done" : "Cancel"}</Text>
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>{browse ? "Exercises" : "Exercise Library"}</Text>
        <Text style={styles.pickerCount}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search exercises..."
        placeholderTextColor={COLORS.textDim}
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
          <Animated.View entering={enter()}>
          <TouchableOpacity style={styles.exerciseRow} onPress={() => setDetail(item)}>
            <View style={[styles.colorBar, { backgroundColor: MUSCLE_COLORS[item.primaryMuscle] || COLORS.primary }]} />
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
            <View style={[styles.diffDot, { backgroundColor: item.difficulty === "Beginner" ? COLORS.primary : item.difficulty === "Intermediate" ? COLORS.warning : COLORS.error }]} />
          </TouchableOpacity>
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No exercises match your search or filters.</Text>
          </View>
        }
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
                browseMode={browse}
                onAdd={() => { onSelect?.(detail); setDetail(null); }}
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
  pickerContainer: { flex: 1, backgroundColor: COLORS.base },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, paddingTop: 60, borderBottomWidth: 1, borderColor: COLORS.border },
  pickerCancel: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 16 },
  pickerTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.4 },
  pickerCount: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 14 },
  searchInput: { margin: SPACING.md, backgroundColor: COLORS.surface1, color: COLORS.text, borderRadius: RADIUS.md, padding: 14, fontSize: 15, fontFamily: FONTS.body, borderWidth: 1, borderColor: COLORS.border },
  filterRow: { flexDirection: "row", paddingHorizontal: SPACING.md, gap: 8, marginBottom: 8, alignItems: "center" },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1 },
  filterBtnActive: { borderColor: COLORS.primary, backgroundColor: "rgba(204, 255, 0, 0.12)" },
  filterBtnText: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  filterBtnTextActive: { color: COLORS.primary },
  clearFilter: { fontFamily: FONTS.bodySemiBold, color: COLORS.error, fontSize: 13 },
  exerciseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingLeft: 0 },
  colorBar: { width: 4, alignSelf: "stretch", borderRadius: RADIUS.sm, marginLeft: SPACING.md },
  exerciseName: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 15, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  equipChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface3 },
  equipChipText: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  diffDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.md },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: SPACING.lg },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyText: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, textAlign: "center", lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 24, paddingBottom: 48, maxHeight: "80%", borderTopWidth: 1, borderColor: COLORS.borderStrong },
  sheetTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.4 },
  sheetOption: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderColor: COLORS.border },
  sheetOptionText: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15 },
  sheetOptionActive: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary },
  filterDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  detailOverlay: { flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: COLORS.base, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 24, paddingBottom: 16, height: "92%" },
});
