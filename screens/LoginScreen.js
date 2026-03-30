// screens/LoginScreen.js
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Check your email", "Verify your account then log in.");
    setLoading(false);
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Error", error.message);
    // On success, App.js will naturally re-render when auth state changes
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <Text style={s.logo}>ShieldHer 💜</Text>
      <Text style={s.sub}>Log in or create an account to securely back up your safety profile.</Text>

      <View style={s.box}>
        <View style={s.inputRow}>
          <Ionicons name="mail-outline" size={18} color="#9ca3af" />
          <TextInput
            style={s.input}
            placeholder="Email address"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            value={email}
            editable={!loading}
          />
        </View>

        <View style={s.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            onChangeText={setPassword}
            value={password}
            editable={!loading}
          />
        </View>

        {loading ? (
          <ActivityIndicator color="#8b5cf6" style={{ marginVertical: 10 }} />
        ) : (
          <>
            <TouchableOpacity style={s.loginBtn} onPress={signIn}>
              <Text style={s.loginText}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.signupBtn} onPress={signUp}>
              <Text style={s.signupText}>Create Account</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0a1e", justifyContent: "center", paddingHorizontal: 24 },
  logo:      { fontSize: 32, fontWeight: "800", color: "#f1f0f5", textAlign: "center", marginBottom: 8 },
  sub:       { fontSize: 13, color: "#9ca3af", textAlign: "center", marginBottom: 32, paddingHorizontal: 10 },
  box:       { backgroundColor: "#1a1130", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(139,92,246,0.18)", gap: 14 },
  inputRow:  { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "rgba(139,92,246,0.2)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.02)" },
  input:     { flex: 1, color: "#f1f0f5", fontSize: 15 },
  loginBtn:  { backgroundColor: "#8b5cf6", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  loginText: { color: "white", fontWeight: "700", fontSize: 15 },
  signupBtn: { backgroundColor: "transparent", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#8b5cf6", marginTop: 4 },
  signupText:{ color: "#a78bfa", fontWeight: "700", fontSize: 15 },
});
