import { ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from "@expo-google-fonts/archivo-narrow";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";
import { MiniWorkoutBar } from "../components/MiniWorkoutBar";
import { Onboarding } from "../components/Onboarding";
import { COLORS, FONTS } from "../constants/theme";
import { ExercisesProvider } from "../contexts/ExercisesProvider";
import { WorkoutProvider } from "../contexts/WorkoutContext";
import { auth } from "../firebaseConfig";
import Login from "./login";

export default function Layout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Pre-auth flow: landing → auth. `authMode` is null while the welcome screen
  // shows; tapping an action picks the Login/Sign-up mode and reveals the form.
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const [fontsLoaded] = useFonts({
    ArchivoNarrow_600SemiBold,
    ArchivoNarrow_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      // Signed out (incl. via Profile → Log Out): return to the landing screen.
      if (!firebaseUser) setAuthMode(null);
    });
    return unsubscribe;
  }, []);

  if (loading || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: COLORS.base }} />;

  if (!user) {
    if (authMode === null) {
      return (
        <Onboarding
          onGetStarted={() => setAuthMode("signup")}
          onLogin={() => setAuthMode("login")}
        />
      );
    }
    return <Login initialSignUp={authMode === "signup"} onBack={() => setAuthMode(null)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ReducedMotionConfig mode={ReduceMotion.System} />
    <ExercisesProvider>
    <WorkoutProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarStyle: { backgroundColor: COLORS.base, borderTopColor: COLORS.border },
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarLabelStyle: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
            headerStyle: { backgroundColor: COLORS.base },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontFamily: FONTS.heading, fontSize: 22, letterSpacing: 0.5 },
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
    </ExercisesProvider>
    </GestureHandlerRootView>
  );
}