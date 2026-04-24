// src/screens/LoginScreen.js
// Auth screen — Email/Password + Google OAuth
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabase";
import { BG, CARD, BORDER, PRIMARY, TEXT, SUBTEXT } from "../../theme/colors";
import useToast from "../../hooks/useToast";

// Google OAuth (optional — graceful if deps not installed)
let GoogleAuth = null;
try {
  const WebBrowser = require("expo-web-browser");
  const AuthSession = require("expo-auth-session");
  WebBrowser.maybeCompleteAuthSession();
  GoogleAuth = { WebBrowser, AuthSession };
} catch (_) {}

export default function LoginScreen() {
  const [mode, setMode]       = useState("signin");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [authError, setAuthError] = useState("");
  const { showToast, ToastComponent } = useToast();

  const shieldAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(shieldAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim,   { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Email/Password Auth ─────────────────────────────────────────────────
  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter your email and password."); return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters."); return;
    }
    setAuthError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        if (!name.trim()) { setAuthError("Please enter your name."); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id, name: name.trim(), updated_at: new Date().toISOString()
          });
        }
        showToast("Account created! Check your email to confirm.", "success", 5000);
      }
    } catch (e) {
      // Map common Supabase error codes to friendly messages
      const msg = e.message || "";
      if (msg.includes("Invalid login") || msg.includes("invalid_credentials")) {
        setAuthError("Incorrect email or password. Please try again.");
      } else if (msg.includes("Email not confirmed")) {
        setAuthError("Please confirm your email before signing in.");
      } else if (msg.includes("already registered") || msg.includes("already exists")) {
        setAuthError("This email is already registered. Try signing in instead.");
      } else {
        setAuthError(msg || "Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: Platform.OS === "web"
            ? window.location.origin
            : "shieldher://auth/callback",
          skipBrowserRedirect: Platform.OS !== "web",
        },
      });

      if (error) throw error;

      // On native, open the OAuth URL in the system browser
      if (Platform.OS !== "web" && data?.url) {
        if (GoogleAuth) {
          await GoogleAuth.WebBrowser.openAuthSessionAsync(
            data.url,
            "shieldher://auth/callback"
          );
        } else {
          const { Linking } = require("react-native");
          await Linking.openURL(data.url);
        }
      }
    } catch (e) {
      if (e.message?.includes("provider") || e.message?.includes("validation_failed")) {
        Alert.alert(
          "Google Sign-In Not Set Up",
          "To enable Google login:\n\n1. Go to console.cloud.google.com → Create OAuth 2.0 credentials\n2. Add redirect URI:\nhttps://fklkcolgqaglrzukoslz.supabase.co/auth/v1/callback\n3. In Supabase → Auth → Providers → Google, paste your Client ID & Secret and enable the toggle\n\nUse email/password below for now.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Google Sign In Failed", e.message || "Could not complete Google sign in.");
      }
    } finally {
      setGoogleLoading(false);
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

          {/* Google Sign In */}
          <TouchableOpacity
            style={[s.googleBtn, googleLoading && { opacity: 0.7 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#4285F4" />
            ) : (
              <>
                <View style={s.googleIconWrap}>
                  <Text style={s.googleG}>G</Text>
                </View>
                <Text style={s.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or use email</Text>
            <View style={s.dividerLine} />
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
              onChangeText={(v) => { setEmail(v); setAuthError(""); }}
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
              onChangeText={(v) => { setPassword(v); setAuthError(""); }}
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

          {/* Inline auth error — shown instead of Alert modal */}
          {!!authError && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#f87171" />
              <Text style={s.errorText}>{authError}</Text>
            </View>
          )}

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
      <ToastComponent />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll:             { flexGrow: 1, backgroundColor: BG, paddingHorizontal: 20, paddingBottom: 40, justifyContent: "center" },
  errorBox:           { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(248,113,113,0.25)", padding: 10, marginTop: 8 },
  errorText:          { flex: 1, fontSize: 12, color: "#f87171", lineHeight: 17 },
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
  // Google OAuth button
  googleBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", marginBottom: 16 },
  googleIconWrap:     { width: 24, height: 24, borderRadius: 12, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  googleG:            { fontSize: 14, fontWeight: "800", color: "#4285F4" },
  googleBtnText:      { color: TEXT, fontWeight: "600", fontSize: 14 },
  // Divider
  dividerRow:         { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  dividerLine:        { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText:        { color: SUBTEXT, fontSize: 11, fontWeight: "500" },
  // Inputs
  inputWrap:          { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  inputIcon:          { marginRight: 10 },
  input:              { flex: 1, fontSize: 14, color: TEXT },
  ctaBtn:             { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  ctaBtnText:         { color: "white", fontWeight: "700", fontSize: 15 },
  switchText:         { fontSize: 13, color: SUBTEXT },
  switchLink:         { color: PRIMARY, fontWeight: "700" },
  footer:             { textAlign: "center", color: SUBTEXT, fontSize: 11, marginTop: 32 },
});
