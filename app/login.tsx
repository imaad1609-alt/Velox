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
import { auth } from "../firebaseConfig";

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Password must include at least one special character.";
  return null;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordError, setPasswordError] = useState("");

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
      <Text style={styles.title}>Velox</Text>
      <Text style={styles.subtitle}>{isSignUp ? "Create an account" : "Welcome back"}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (isSignUp) setPasswordError(validatePassword(text) || "");
        }}
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

      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isSignUp ? "Sign Up" : "Log In"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setPasswordError(""); }}>
        <Text style={styles.switchText}>
          {isSignUp ? "Already have an account? Log In" : "No account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0D0D",
    padding: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#6C63FF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    backgroundColor: "#1A1A2E",
    color: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  requirementsBox: {
    width: "100%",
    marginBottom: 12,
  },
  req: {
    color: "#888",
    fontSize: 13,
    marginBottom: 4,
  },
  reqMet: {
    color: "#00C9A7",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 13,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  button: {
    width: "100%",
    backgroundColor: "#6C63FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  switchText: {
    color: "#6C63FF",
    fontSize: 14,
  },
});
