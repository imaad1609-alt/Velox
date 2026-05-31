import { StyleSheet, Text, View } from "react-native";

export default function Workout() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workout</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0D0D",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 24,
  },
});