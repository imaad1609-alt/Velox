import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { MiniWorkoutBar } from "../components/MiniWorkoutBar";
import { WorkoutProvider } from "../contexts/WorkoutContext";
import { auth } from "../firebaseConfig";
import Login from "./login";

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={{ flex: 1, backgroundColor: "#0D0D0D" }} />;

  if (!user) return <Login />;

  return (
    <WorkoutProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarStyle: { backgroundColor: "#0D0D0D", borderTopColor: "#1A1A2E" },
            tabBarActiveTintColor: "#6C63FF",
            tabBarInactiveTintColor: "#888888",
            headerStyle: { backgroundColor: "#0D0D0D" },
            headerTintColor: "#FFFFFF",
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
          <Tabs.Screen name="workout" options={{ title: "Workout", tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} /> }} />
          <Tabs.Screen name="nutrition" options={{ title: "Nutrition", tabBarIcon: ({ color, size }) => <Ionicons name="nutrition" size={size} color={color} /> }} />
          <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
          <Tabs.Screen name="login" options={{ href: null }} />
        </Tabs>
        <MiniWorkoutBar />
      </View>
    </WorkoutProvider>
  );
}