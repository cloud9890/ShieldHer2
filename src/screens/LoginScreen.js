// src/screens/LoginScreen.js
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../api/supabase";

const BG      = "#0d1117";
const CARD    = "#161b22";
const BORDER  = "rgba(255,255,255,0.07)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f0f6fc";
const SUBTEXT = "#8b949e";

export default function LoginScreen() {
  const [mode, setMode]       = useState("signin"); // "signin" | "signup"
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const shieldAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(shieldAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim,   { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter email and password."); return;
    }
    if (password.length < 6) {
      Alert.alert("Too Short", "Password must be at least 6 characters."); return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        if (!name.trim()) { Alert.alert("Required", "Please enter your name."); return; }
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id, name: name.trim(), updated_at: new Date().toISOString()
          });
        }
        Alert.alert("✅ Account Created", "Check your email to confirm your account.");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo Section */}
        <Animated.View style={[s.logoSection, { opacity: fadeAnim, transform: [{ scale: shieldAnim }] }]}>
          <View style={s.shieldContainer}>
            <View style={s.shieldOuter}>
              <View style={s.shieldInner}>
                <Ionicons name="shield-checkmark" size={40} color="white" />
              </View>
            </View>
            {/* Glow rings */}
            <View style={[s.shieldRing, s.shieldRing1]} />
            <View style={[s.shieldRing, s.shieldRing2]} />
          </View>
          <Text style={s.appName}>ShieldHer</Text>
          <Text style={s.tagline}>Your personal safety companion</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[s.card, { opacity: fadeAnim }]}>
          {/* Mode Toggle */}
          <View style={s.modeToggle}>
            {["signin", "signup"].map(m => (
              <TouchableOpacity key={m} style={[s.modeBtn, mode === m && s.modeBtnActive]} onPress={() => setMode(m)}>
                <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                  {m === "signin" ? "Sign In" : "Create Account"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name (only for signup) */}
          {mode === "signup" && (
            <View style={s.inputWrap}>
              <Ionicons name="person-outline" size={18} color={SUBTEXT} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Full Name"
                placeholderTextColor={SUBTEXT}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={SUBTEXT} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Email Address"
              placeholderTextColor={SUBTEXT}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={SUBTEXT} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={SUBTEXT}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={{ padding: 4 }}>
              <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={SUBTEXT} />
            </TouchableOpacity>
          </View>

          {/* CTA Button */}
          <TouchableOpacity style={[s.ctaBtn, loading && { opacity: 0.7 }]} onPress={handleAuth} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={s.ctaBtnText}>{mode === "signin" ? "Sign In" : "Create Account"}</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </>
            )}
          </TouchableOpacity>

          {/* Switch mode */}
          <TouchableOpacity style={{ marginTop: 16, alignItems: "center" }} onPress={() => setMode(m => m === "signin" ? "signup" : "signin")}>
            <Text style={s.switchText}>
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <Text style={s.switchLink}>{mode === "signin" ? "Sign up" : "Sign in"}</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.footer}>Protected by end-to-end encryption 🔒</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:             { flexGrow: 1, backgroundColor: BG, paddingHorizontal: 20, paddingBottom: 40, justifyContent: "center" },
  logoSection:        { alignItems: "center", paddingTop: 60, marginBottom: 36 },
  shieldContainer:    { width: 100, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  shieldOuter:        { width: 90, height: 90, borderRadius: 26, backgroundColor: "rgba(139,92,246,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" },
  shieldInner:        { width: 72, height: 72, borderRadius: 20, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  shieldRing:         { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "rgba(139,92,246,0.2)" },
  shieldRing1:        { width: 110, height: 110 },
  shieldRing2:        { width: 130, height: 130, borderColor: "rgba(139,92,246,0.1)" },
  appName:            { fontSize: 34, fontWeight: "900", color: TEXT, letterSpacing: -0.5 },
  tagline:            { fontSize: 14, color: SUBTEXT, marginTop: 6 },
  card:               { backgroundColor: CARD, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: BORDER },
  modeToggle:         { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 4, marginBottom: 20 },
  modeBtn:            { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 11 },
  modeBtnActive:      { backgroundColor: PRIMARY },
  modeBtnText:        { fontSize: 13, fontWeight: "600", color: SUBTEXT },
  modeBtnTextActive:  { color: "white" },
  inputWrap:          { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  inputIcon:          { marginRight: 10 },
  input:              { flex: 1, fontSize: 14, color: TEXT },
  ctaBtn:             { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  ctaBtnText:         { color: "white", fontWeight: "700", fontSize: 15 },
  switchText:         { fontSize: 13, color: SUBTEXT },
  switchLink:         { color: PRIMARY, fontWeight: "700" },
  footer:             { textAlign: "center", color: SUBTEXT, fontSize: 11, marginTop: 32 },
});
