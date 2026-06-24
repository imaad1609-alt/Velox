import * as Haptics from "expo-haptics";
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { PRESS } from "../constants/motion";

// Drop-in replacement for a primary-action TouchableOpacity: the content springs
// down to PRESS.scaleTo on press and back on release, for tactile feedback.
// Reserve for prominent CTAs (not icon/menu taps).
export const PressableScale = ({
  children,
  onPress,
  style,
  disabled = false,
  haptic = false,
}: {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        disabled={disabled}
        onPressIn={() => { scale.value = withTiming(PRESS.scaleTo, { duration: PRESS.in }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: PRESS.out }); }}
        onPress={(e) => {
          if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
