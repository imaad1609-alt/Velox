import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Body, { ExtendedBodyPart, Slug } from "react-native-body-highlighter";
import { MuscleGroup } from "../constants/exercises";

// Highlight colours by intensity: [tertiary, secondary, primary] → intensity 1/2/3
const INTENSITY_COLORS = ["#3A3A5C", "#4ECDC4", "#6C63FF"];
const PRIMARY_COLOR = "#6C63FF";
const SECONDARY_COLOR = "#4ECDC4";
const TERTIARY_COLOR = "#3A3A5C";

// Map our muscle-group names onto the slugs the body-highlighter understands.
// A few of ours have no exact match, so we use the closest anatomical region.
const MUSCLE_TO_SLUGS: Record<MuscleGroup, Slug[]> = {
  Chest: ["chest"],
  Back: ["upper-back", "lower-back"],
  Shoulders: ["deltoids"],
  Biceps: ["biceps"],
  Triceps: ["triceps"],
  Quadriceps: ["quadriceps"],
  Hamstrings: ["hamstring"],
  Glutes: ["gluteal"],
  Calves: ["calves"],
  Core: ["abs", "obliques"],
  "Full Body": ["chest", "abs", "quadriceps", "upper-back", "gluteal", "deltoids"],
  Forearms: ["forearm"],
  Adductors: ["adductors"],
  Abductors: ["gluteal"], // hip abductors ≈ glute medius; closest available slug
  Neck: ["neck"],
  Cardio: [], // no single targeted muscle
  Legs: ["quadriceps", "hamstring", "gluteal", "calves"],
};

type Props = {
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  tertiary?: MuscleGroup[];
};

// Builds the highlight data, keeping the strongest intensity if a slug shows up
// in more than one tier (e.g. a muscle that is both primary and secondary).
const buildData = (primary: MuscleGroup, secondary: MuscleGroup[], tertiary: MuscleGroup[]): ExtendedBodyPart[] => {
  const bySlug = new Map<Slug, number>();
  const apply = (groups: MuscleGroup[], intensity: number) => {
    for (const g of groups) {
      for (const slug of MUSCLE_TO_SLUGS[g] ?? []) {
        bySlug.set(slug, Math.max(bySlug.get(slug) ?? 0, intensity));
      }
    }
  };
  // Lowest first so primary wins on overlap.
  apply(tertiary, 1);
  apply(secondary, 2);
  apply([primary], 3);
  return Array.from(bySlug, ([slug, intensity]) => ({ slug, intensity }));
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

export const MuscleMap = ({ primary, secondary = [], tertiary = [] }: Props) => {
  const data = useMemo(() => buildData(primary, secondary, tertiary), [primary, secondary, tertiary]);

  if (primary === "Cardio" && data.length === 0) {
    return <Text style={styles.cardioNote}>Full-body cardio — no single targeted muscle.</Text>;
  }

  return (
    <View>
      <View style={styles.bodies}>
        <View style={styles.bodyCol}>
          <Body data={data} side="front" gender="male" scale={0.45} colors={INTENSITY_COLORS} border="none" />
          <Text style={styles.bodyLabel}>Front</Text>
        </View>
        <View style={styles.bodyCol}>
          <Body data={data} side="back" gender="male" scale={0.45} colors={INTENSITY_COLORS} border="none" />
          <Text style={styles.bodyLabel}>Back</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <Legend color={PRIMARY_COLOR} label="Primary" />
        {secondary.length > 0 && <Legend color={SECONDARY_COLOR} label="Secondary" />}
        {tertiary.length > 0 && <Legend color={TERTIARY_COLOR} label="Also works" />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bodies: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  bodyCol: { alignItems: "center" },
  bodyLabel: { color: "#888", fontSize: 12, fontWeight: "600", marginTop: 4 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#AAA", fontSize: 12 },
  cardioNote: { color: "#888", fontSize: 14, fontStyle: "italic" },
});
