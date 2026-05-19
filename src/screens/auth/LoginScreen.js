// src/screens/auth/LoginScreen.js
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../api/supabase";
import Hoverable from "../../components/common/Hoverable";
import { Mail, Lock, ShieldCheck } from "lucide-react-native";
import {
  BG_DEEP,
  CARD_DEEP,
  PRIMARY,
  TEXT,
  SUBTEXT,
  BORDER_VIOLET,
} from "../../theme/colors";

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        Alert.alert("Login Failed", error.message);
      }
    } catch (err) {
      Alert.alert("Login Failed", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#1e1b4b', '#000000']} style={StyleSheet.absoluteFillObject} />
      
      {/* Abstract Glow Orbs for Glassmorphism Background */}
      <View style={s.orb1} />
      <View style={s.orb2} />

      <View style={s.content}>
        <View style={s.header}>
          <View style={s.iconWrapper}>
            <ShieldCheck size={48} color="#c084fc" />
          </View>
          <Text style={s.title}>Welcome Back</Text>
          <Text style={s.subtitle}>Sign in to your secure safety vault</Text>
        </View>

        <View style={s.glassCard}>
          <View style={s.inputContainer}>
            <Mail size={20} color="#94a3b8" />
            <TextInput
              style={s.input}
              placeholder="Email Address"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={s.inputContainer}>
            <Lock size={20} color="#94a3b8" />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Hoverable style={s.btn} onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={['#8b5cf6', '#6d28d9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={s.btnText}>Sign In</Text>
              )}
            </LinearGradient>
          </Hoverable>
        </View>

        <Hoverable
          style={s.linkBtn}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={s.linkText}>
            Don't have an account?{" "}
            <Text style={{ color: "#c084fc", fontWeight: "700" }}>Sign Up</Text>
          </Text>
        </Hoverable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  orb1: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#8b5cf6',
    opacity: 0.15,
  },
  orb2: {
    position: 'absolute',
    bottom: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#ec4899',
    opacity: 0.1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 40 },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 16, color: "#94a3b8" },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: { flex: 1, marginLeft: 14, color: "#f8fafc", fontSize: 16 },
  btn: {
    height: 60,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontSize: 17, fontWeight: "700", letterSpacing: 0.5 },
  linkBtn: { alignItems: "center", marginTop: 24, padding: 10 },
  linkText: { color: "#94a3b8", fontSize: 15 },
});
