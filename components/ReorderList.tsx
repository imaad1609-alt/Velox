import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { COLORS, FONTS, RADIUS } from "../constants/theme";

// A drag-to-reorder overlay. Rendered as its own Modal (not inline in the
// logger) so dragging never fights the live TextInputs in a ScrollView.
// Returns the new order as an array where order[newIndex] = oldIndex.

type Item = { label: string; color: string };
const ROW_HEIGHT = 56;

export const ReorderList = ({
  items,
  onDone,
  onClose,
}: {
  items: Item[];
  onDone: (order: number[]) => void;
  onClose: () => void;
}) => {
  // order[position] = original item index
  const [order, setOrder] = useState<number[]>(items.map((_, i) => i));
  const dragY = useSharedValue(0);
  const draggingSlot = useSharedValue(-1);

  const move = (from: number, to: number) =>
    setOrder((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const u = [...prev];
      const [m] = u.splice(from, 1);
      u.splice(to, 0, m);
      return u;
    });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Reorder exercises</Text>
          <View style={{ height: order.length * ROW_HEIGHT }}>
            {order.map((itemIndex, slot) => (
              <Row
                key={itemIndex}
                item={items[itemIndex]}
                slot={slot}
                count={order.length}
                dragY={dragY}
                draggingSlot={draggingSlot}
                move={move}
              />
            ))}
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.done} onPress={() => onDone(order)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const Row = ({
  item,
  slot,
  count,
  dragY,
  draggingSlot,
  move,
}: {
  item: Item;
  slot: number;
  count: number;
  dragY: SharedValue<number>;
  draggingSlot: SharedValue<number>;
  move: (from: number, to: number) => void;
}) => {
  const pan = Gesture.Pan()
    .onStart(() => {
      draggingSlot.value = slot;
      dragY.value = 0;
    })
    .onUpdate((e) => {
      const raw = slot + Math.round(e.translationY / ROW_HEIGHT);
      const target = Math.max(0, Math.min(count - 1, raw));
      if (target !== draggingSlot.value) {
        runOnJS(move)(draggingSlot.value, target);
        draggingSlot.value = target;
      }
      // Keep the dragged row under the finger even after it changes slots.
      dragY.value = e.translationY + (slot - draggingSlot.value) * ROW_HEIGHT;
    })
    .onEnd(() => {
      dragY.value = 0;
      draggingSlot.value = -1;
    });

  const animStyle = useAnimatedStyle(() => {
    const active = draggingSlot.value === slot;
    return {
      transform: [{ translateY: active ? dragY.value : 0 }, { scale: active ? 1.04 : 1 }],
      zIndex: active ? 10 : 0,
      opacity: active ? 0.95 : 1,
    };
  });

  return (
    <Animated.View style={[styles.row, { top: slot * ROW_HEIGHT }, animStyle]}>
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
      <GestureDetector gesture={pan}>
        <View style={styles.grip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="reorder-three" size={24} color={COLORS.textMuted} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.borderStrong },
  title: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.4 },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  label: { flex: 1, fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 15 },
  grip: { paddingLeft: 12, paddingVertical: 8 },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  cancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  done: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center" },
  doneText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 15 },
});
