// screens/LoginScreen.js — Premium Redesign
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../api/supabase";

const { width, height } = Dimensions.get("window");

const BG_TOP    = "#0d0520";
const BG_BOT    = "#0f0a1e";
const CARD      = "rgba(26,17,48,0.95)";
const PRIMARY   = "#8b5cf6";
const PINK      = "#ec4899";
const TEXT      = "#f1f0f5";
const SUBTEXT   = "#9ca3af";
const BORDER    = "rgba(139,92,246,0.25)";
const INPUT_BG  = "rgba(255,255,255,0.04)";

export default function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [mode,     setMode]     = useState("signin"); // "signin" | "signup"

  // Entrance animations
  const fadeLogo  = useRef(new Animated.Value(0)).current;
  const slideCard = useRef(new Animated.Value(60)).current;
  const fadeCard  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeLogo,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeCard,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideCard, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const signIn = async () => {
    if (!email || !password) { setErrorMsg("Please fill in both fields."); return; }
    setLoading(true); setErrorMsg(null); setSuccessMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg(error.message);
    setLoading(false);
  };

  const signUp = async () => {
    if (!email || !password) { setErrorMsg("Please fill in both fields."); return; }
    if (password.length < 6)  { setErrorMsg("Password must be at least 6 characters."); return; }
    setLoading(true); setErrorMsg(null); setSuccessMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setErrorMsg(error.message); }
    else { setSuccessMsg("Account created! Check your email for a confirmation link."); }
    setLoading(false);
  };

  return (
    <View style={s.root}>
      {/* Background gradient */}
      <LinearGradient colors={[BG_TOP, BG_BOT]} style={StyleSheet.absoluteFill} />

      {/* Decorative blobs */}
      <View style={s.blob1} />
      <View style={s.blob2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <Animated.View style={[s.logoArea, { opacity: fadeLogo }]}>
            <View style={s.shieldRing}>
              <View style={s.shieldInner}>
                <Ionicons name="shield" size={38} color={PRIMARY} />
              </View>
            </View>
            <Text style={s.appName}>ShieldHer</Text>
            <Text style={s.tagline}>Your personal safety companion</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[s.card, { opacity: fadeCard, transform: [{ translateY: slideCard }] }]}>

            {/* Tab toggle */}
            <View style={s.tabRow}>
              {[["signin", "Sign In"], ["signup", "Create Account"]].map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  style={[s.tab, mode === k && s.tabActive]}
                  onPress={() => { setMode(k); setErrorMsg(null); setSuccessMsg(null); }}
                >
                  <Text style={[s.tabText, mode === k && s.tabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Email */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Email Address</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={17} color={SUBTEXT} />
                <TextInput
                  style={s.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#4b5563"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={17} color={SUBTEXT} />
                <TextInput
                  style={s.input}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  placeholderTextColor="#4b5563"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={17} color={SUBTEXT} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            {errorMsg && (
              <View style={s.msgRow}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View style={[s.msgRow, { backgroundColor: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.2)" }]}>
                <Ionicons name="checkmark-circle" size={14} color="#34d399" />
                <Text style={[s.errorText, { color: "#34d399" }]}>{successMsg}</Text>
              </View>
            )}

            {/* CTA Button */}
            {loading ? (
              <ActivityIndicator color={PRIMARY} style={{ marginVertical: 16 }} />
            ) : (
              <TouchableOpacity
                style={s.cta}
                onPress={mode === "signin" ? signIn : signUp}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#7c3aed", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Ionicons name={mode === "signin" ? "log-in-outline" : "person-add-outline"} size={18} color="white" />
                  <Text style={s.ctaText}>{mode === "signin" ? "Sign In Securely" : "Create Account"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Security note */}
            <View style={s.secNote}>
              <Ionicons name="lock-closed" size={12} color="#4b5563" />
              <Text style={s.secNoteText}>End-to-end encrypted · Powered by Supabase</Text>
            </View>
          </Animated.View>

          {/* Features strip */}
          <View style={s.featureStrip}>
            {[
              { icon: "alert-circle-outline", label: "SOS Alerts" },
              { icon: "location-outline",     label: "Live Tracking" },
              { icon: "shield-outline",       label: "AI Safety" },
            ].map(f => (
              <View key={f.label} style={s.featureItem}>
                <Ionicons name={f.icon} size={18} color={PRIMARY} />
                <Text style={s.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG_BOT },
  kav:           { flex: 1 },
  scroll:        { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingTop: 60 },

  // Decorative background blobs
  blob1:         { position: "absolute", top: -80, left: -60, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(139,92,246,0.08)" },
  blob2:         { position: "absolute", bottom: 60, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(236,72,153,0.06)" },

  // Logo
  logoArea:      { alignItems: "center", marginBottom: 32 },
  shieldRing:    { width: 88, height: 88, borderRadius: 28, borderWidth: 1.5, borderColor: "rgba(139,92,246,0.4)", alignItems: "center", justifyContent: "center", marginBottom: 14, backgroundColor: "rgba(139,92,246,0.06)" },
  shieldInner:   { width: 66, height: 66, borderRadius: 20, backgroundColor: "rgba(139,92,246,0.12)", alignItems: "center", justifyContent: "center" },
  appName:       { fontSize: 34, fontWeight: "900", color: TEXT, letterSpacing: -0.5 },
  tagline:       { fontSize: 13, color: SUBTEXT, marginTop: 4, fontWeight: "500" },

  // Card
  card:          { backgroundColor: CARD, borderRadius: 28, borderWidth: 1, borderColor: BORDER, padding: 24, gap: 16, shadowColor: "#8b5cf6", shadowOpacity: 0.15, shadowRadius: 24, elevation: 12 },

  // Tab toggle
  tabRow:        { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  tab:           { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 11 },
  tabActive:     { backgroundColor: PRIMARY },
  tabText:       { fontSize: 13, fontWeight: "600", color: SUBTEXT },
  tabTextActive: { color: "white" },

  // Fields
  field:         { gap: 6 },
  fieldLabel:    { fontSize: 11, fontWeight: "700", color: SUBTEXT, letterSpacing: 0.5, textTransform: "uppercase" },
  inputWrap:     { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: INPUT_BG },
  input:         { flex: 1, color: TEXT, fontSize: 15 },

  // Messages
  msgRow:        { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", borderRadius: 12, padding: 10 },
  errorText:     { flex: 1, color: "#ef4444", fontSize: 12, fontWeight: "600", lineHeight: 17 },

  // CTA
  cta:           { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  ctaGrad:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  ctaText:       { color: "white", fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },

  // Security note
  secNote:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  secNoteText:   { fontSize: 11, color: "#374151" },

  // Feature strip
  featureStrip:  { flexDirection: "row", justifyContent: "center", gap: 28, marginTop: 28 },
  featureItem:   { alignItems: "center", gap: 4 },
  featureText:   { fontSize: 10, color: "#4b5563", fontWeight: "600" },
});
