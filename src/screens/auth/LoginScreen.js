import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useSignUp, useOAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../../api/supabase";
import useToast from "../../hooks/useToast";

WebBrowser.maybeCompleteAuthSession();

// Ethereal Sentinel Cosmic Design Tokens
const THEME = {
  background: "#110924",
  surface_container_highest: "rgba(43, 31, 70, 0.7)", // 70% opacity for glassmorphism
  surface_bright: "#31244f",
  primary: "#ba9eff",
  primary_dim: "#8455ef",
  on_surface: "#ece0ff",
  on_surface_variant: "#b2a5c9",
  outline_variant: "rgba(76, 67, 98, 0.2)",
  success_green: "#34D399"
};

export default function LoginScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: startAppleAuth } = useOAuth({ strategy: "oauth_apple" });

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [authError, setAuthError] = useState("");
  const { showToast, ToastComponent } = useToast();

  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
        ])
      )
    ]).start();
  }, []);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  // ── Email/Password Authentication (Clerk v2 API) ────────────────────────
  const handleAuth = async () => {
    if (!isSignInLoaded || !isSignUpLoaded) return;
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter your email and password."); return;
    }

    setAuthError("");
    setLoading(true);

    try {
      if (mode === "signin") {
        // Clerk v2: signIn.password() instead of signIn.create()
        const result = await signIn.password({ identifier: email, password });
        if (result?.status === 'complete') {
          await setSignInActive({ session: result.createdSessionId });
        } else if (result?.error) {
          setAuthError(result.error?.message || "Sign in failed.");
        }
      } else {
        if (!name.trim()) { setAuthError("Please provide your name."); setLoading(false); return; }

        // Clerk v2: signUp.password() instead of signUp.create()
        const result = await signUp.password({ emailAddress: email, password });
        if (result?.error) {
          if (result.error?.code === 'form_identifier_exists') {
            setMode("signin");
            setAuthError("Account already exists! Please log in.");
          } else {
            setAuthError(result.error?.message || "Sign up failed.");
          }
          return;
        }
        // Send verification OTP — Clerk v2 API
        await signUp.verifications.sendEmailCode();
        setPendingVerification(true);
      }
    } catch (e) {
      const errCode = e.errors?.[0]?.code || e.code;
      const errMsg  = e.errors?.[0]?.message || e.message || "Authentication failed.";
      if (errCode === 'form_identifier_exists') {
        setMode("signin");
        setAuthError("Account already exists! Please log in.");
      } else {
        setAuthError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isSignUpLoaded) return;
    setAuthError("");
    setLoading(true);
    try {
      // Clerk v2: signUp.verifications.verifyEmailCode() instead of attemptEmailAddressVerification()
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === 'complete') {
        await setSignUpActive({ session: signUp.createdSessionId });
      } else {
        setAuthError("Verification incomplete. Please try again.");
      }
    } catch (e) {
      setAuthError(e.errors?.[0]?.message || e.message || "Invalid code. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  // ── Clerk OAuth (v2) ─────────────────────────────────────────────────────
  const handleOAuth = async (provider) => {
    setOauthLoading(true);
    try {
      const flow = provider === "google" ? startGoogleAuth : startAppleAuth;
      const { createdSessionId, setActive } = await flow({
        redirectUrl: Linking.createURL('/'),
      });
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
      }
    } catch (e) {
      console.log('OAuth Error:', JSON.stringify(e));
      Alert.alert("OAuth Error", e.errors?.[0]?.message || "Could not complete social sign in.");
    } finally {
      setOauthLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Background Nebula Effect */}
      <View style={s.nebula1} />
      <View style={s.nebula2} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <Animated.View style={[s.header, { opacity: fadeAnim }]}>
          <Animated.View style={[s.shieldGlow, { opacity: glowAnim }]} />
          <View style={s.shieldIconWrapper}>
            <Ionicons name="shield-checkmark" size={44} color={THEME.primary} />
          </View>
          <Text style={s.brandTitle}>ShieldHer</Text>
          <Text style={s.brandSubtitle}>The Ethereal Sentinel</Text>
        </Animated.View>

        {/* Glassmorphism Card */}
        <Animated.View style={[s.glassCard, { opacity: fadeAnim }]}>
          {/* Mode Toggle */}
          <View style={s.tabContainer}>
            {["signin", "signup"].map(m => (
              <TouchableOpacity key={m} style={s.tabButton} onPress={() => { setMode(m); setPendingVerification(false); setCode(''); setAuthError(""); }}>
                <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                  {m === "signin" ? "Login" : "Sign Up"}
                </Text>
                {mode === m && <View style={s.activeTabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Social OAuth */}
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialBtn} onPress={() => handleOAuth("google")} disabled={oauthLoading}>
              <Ionicons name="logo-google" size={20} color={THEME.on_surface} />
              <Text style={s.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.socialBtn} onPress={() => handleOAuth("apple")} disabled={oauthLoading}>
              <Ionicons name="logo-apple" size={20} color={THEME.on_surface} />
              <Text style={s.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={s.dividerContainer}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>OR CONTINUE WITH EMAIL</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Input Fields / Verification Toggle */}
          {pendingVerification ? (
            <View style={{ gap: 14 }}>
              <Text style={{ color: THEME.on_surface, fontSize: 13, textAlign: 'center', marginBottom: 8, opacity: 0.8 }}>We've sent a 6-digit code to {email}.</Text>

              <View style={[s.inputWrap, { borderColor: THEME.primary }]}>
                <Ionicons name="key-outline" size={18} color={THEME.primary} />
                <TextInput style={s.input} placeholder="Verification Code" placeholderTextColor={THEME.on_surface_variant} value={code} onChangeText={(v) => { setCode(v); setAuthError(""); }} keyboardType="number-pad" />
              </View>

              {!!authError && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#ff6e84" />
                  <Text style={s.errorText}>{authError}</Text>
                </View>
              )}

              <TouchableOpacity style={[s.primaryCTA, loading && { opacity: 0.8 }]} onPress={onPressVerify} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <Text style={s.primaryCTAText}>Verify Email & Complete</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setPendingVerification(false); setCode(''); }} style={{ alignItems: 'center', marginTop: 10 }}>
                <Text style={s.forgotText}>Back to Sign Up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {mode === "signup" && (
                <View style={s.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={THEME.on_surface_variant} />
                  <TextInput style={s.input} placeholder="Full Name" placeholderTextColor={THEME.on_surface_variant} value={name} onChangeText={setName} autoCapitalize="words" />
                </View>
              )}

              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={THEME.on_surface_variant} />
                <TextInput style={s.input} placeholder="Email Address" placeholderTextColor={THEME.on_surface_variant} value={email} onChangeText={(v) => { setEmail(v); setAuthError(""); }} keyboardType="email-address" autoCapitalize="none" />
              </View>

              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={THEME.on_surface_variant} />
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Password" placeholderTextColor={THEME.on_surface_variant} value={password} onChangeText={(v) => { setPassword(v); setAuthError(""); }} secureTextEntry={!showPwd} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={THEME.on_surface_variant} />
                </TouchableOpacity>
              </View>

              {mode === "signin" && (
                <TouchableOpacity style={s.forgotWrap}>
                  <Text style={s.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {!!authError && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#ff6e84" />
                  <Text style={s.errorText}>{authError}</Text>
                </View>
              )}

              <TouchableOpacity style={[s.primaryCTA, loading && { opacity: 0.8 }]} onPress={handleAuth} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <Text style={s.primaryCTAText}>{mode === "signin" ? "Sign In to ShieldHer" : "Initialize Sentinel Sync"}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Security Badge */}
        <View style={s.badgeContainer}>
          <Ionicons name="shield-checkmark" size={14} color={THEME.success_green} />
          <Text style={s.badgeText}>Verified Secure Connection</Text>
        </View>

      </ScrollView>
      <ToastComponent />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  nebula1: { position: "absolute", top: -100, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: THEME.primary, opacity: 0.15, filter: "blur(60px)" },
  nebula2: { position: "absolute", bottom: -50, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: THEME.primary_dim, opacity: 0.1, filter: "blur(80px)" },

  scroll: { flexGrow: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  shieldGlow: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: THEME.primary, opacity: 0.4, filter: "blur(20px)" },
  shieldIconWrapper: { width: 72, height: 72, borderRadius: 24, backgroundColor: THEME.surface_bright, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(186, 158, 255, 0.2)" },
  brandTitle: { fontSize: 32, fontWeight: "800", color: THEME.on_surface, marginTop: 16, letterSpacing: -1 },
  brandSubtitle: { fontSize: 13, fontWeight: "600", color: THEME.primary, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },

  glassCard: { backgroundColor: THEME.surface_container_highest, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: THEME.outline_variant, overflow: "hidden" },
  tabContainer: { flexDirection: "row", marginBottom: 30 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 16, fontWeight: "600", color: THEME.on_surface_variant },
  tabTextActive: { color: THEME.on_surface },
  activeTabIndicator: { position: "absolute", bottom: 0, width: "40%", height: 3, backgroundColor: THEME.primary, borderRadius: 2 },

  socialRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  socialBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "transparent", borderWidth: 1, borderColor: THEME.outline_variant, borderRadius: 12 },
  socialText: { fontSize: 14, fontWeight: "600", color: THEME.on_surface },

  dividerContainer: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: THEME.outline_variant },
  dividerText: { fontSize: 10, fontWeight: "700", color: THEME.on_surface_variant, letterSpacing: 1 },

  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, borderWidth: 1, borderColor: THEME.outline_variant, paddingHorizontal: 16, height: 54, marginBottom: 16 },
  input: { flex: 1, paddingLeft: 12, fontSize: 15, color: THEME.on_surface },
  forgotWrap: { alignItems: "flex-end", marginBottom: 24 },
  forgotText: { fontSize: 12, fontWeight: "600", color: THEME.primary },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255, 110, 132, 0.1)", padding: 12, borderRadius: 12, marginBottom: 20 },
  errorText: { flex: 1, fontSize: 12, color: "#ff6e84" },

  primaryCTA: { height: 56, backgroundColor: THEME.primary_dim, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryCTAText: { fontSize: 16, fontWeight: "700", color: "white" },

  badgeContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 32 },
  badgeText: { fontSize: 12, fontWeight: "600", color: THEME.success_green }
});
