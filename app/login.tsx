import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { PressableScale } from "../components/PressableScale";
import { auth } from "../firebaseConfig";

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Password must include at least one special character.";
  return null;
};

export default function Login({
  initialSignUp = false,
  onBack,
}: {
  initialSignUp?: boolean;
  onBack?: () => void;
} = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [passwordError, setPasswordError] = useState("");
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  const handleAuth = async () => {
    if (isSignUp) {
      const error = validatePassword(password);
      if (error) {
        setPasswordError(error);
        return;
      }
    }
    setPasswordError("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>VELOX</Text>
      <Text style={styles.brandLine}>HIGH-PERFORMANCE TELEMETRY</Text>

      {/* Terminal card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{isSignUp ? "Initialize Account" : "Access Terminal"}</Text>
        <View style={styles.limeRule} />

        <Text style={styles.fieldLabel}>Email or Username</Text>
        <TextInput
          style={[styles.input, focused === "email" && styles.inputFocused]}
          placeholder="user@velox.system"
          placeholderTextColor={COLORS.textDim}
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={[styles.input, focused === "password" && styles.inputFocused]}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textDim}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (isSignUp) setPasswordError(validatePassword(text) || "");
          }}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused(null)}
          secureTextEntry
        />

        {isSignUp && (
          <View style={styles.requirementsBox}>
            <Text style={[styles.req, password.length >= 8 && styles.reqMet]}>✓ At least 8 characters</Text>
            <Text style={[styles.req, /[A-Z]/.test(password) && styles.reqMet]}>✓ One capital letter</Text>
            <Text style={[styles.req, /[0-9]/.test(password) && styles.reqMet]}>✓ One number</Text>
            <Text style={[styles.req, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && styles.reqMet]}>✓ One special character</Text>
          </View>
        )}

        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <PressableScale style={styles.button} onPress={handleAuth} haptic>
          <Text style={styles.buttonText}>{isSignUp ? "Create Account ⚡" : "Log In ⚡"}</Text>
        </PressableScale>

        <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setPasswordError(""); }}>
          <Text style={styles.switchText}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text style={styles.switchAccent}>{isSignUp ? "Log In" : "Sign Up"}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.base,
    padding: SPACING.lg,
  },
  backBtn: {
    position: "absolute",
    top: 56,
    left: SPACING.md,
    zIndex: 10,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 56,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  brandLine: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: SPACING.xl,
    textTransform: "uppercase",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
  },
  cardLabel: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  limeRule: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    marginTop: 8,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: COLORS.base,
    color: COLORS.text,
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.body,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  requirementsBox: {
    width: "100%",
    marginBottom: 12,
  },
  req: {
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  reqMet: {
    color: COLORS.primary,
  },
  errorText: {
    fontFamily: FONTS.body,
    color: COLORS.error,
    fontSize: 13,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  button: {
    width: "100%",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  buttonText: {
    fontFamily: FONTS.display,
    color: COLORS.onPrimary,
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  switchText: {
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  switchAccent: {
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
  },
});
