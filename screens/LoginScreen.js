// screens/LoginScreen.js — Final Obsidian Premium Redesign
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../services/supabase";

const { width, height } = Dimensions.get("window");

const BG_TOP    = "#0d0520";
const BG_BOT    = "#0f0a1e";
const CARD      = "rgba(26,17,48,0.7)"; // More translucent for glass effect
const PRIMARY   = "#8b5cf6";
const PINK      = "#ec4899";
const TEXT      = "#f1f0f5";
const SUBTEXT   = "#9ca3af";
const BORDER    = "rgba(139,92,246,0.22)";
const INPUT_BG  = "rgba(0,0,0,0.3)";

export default function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [mode,     setMode]     = useState("signin");

  const fadeLogo  = useRef(new Animated.Value(0)).current;
  const slideCard = useRef(new Animated.Value(40)).current;
  const fadeCard  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(fadeLogo,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeCard,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideCard, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const signIn = async () => {
    if (!email || !password) { setErrorMsg("Please fill in all fields."); return; }
    setLoading(true); setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg(error.message);
    setLoading(false);
  };

  const signUp = async () => {
    if (!email || !password) { setErrorMsg("Please fill in all fields."); return; }
    setLoading(true); setErrorMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setErrorMsg(error.message);
    else setSuccessMsg("Account created! Verify your email.");
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[BG_TOP, BG_BOT]} style={StyleSheet.absoluteFill} />
      
      {/* Dynamic Background Blobs */}
      <View style={s.blob1} />
      <View style={s.blob2} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.kav}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Brand Header */}
          <Animated.View style={[s.brand, { opacity: fadeLogo }]}>
            <View style={s.logoGlow}>
              <View style={s.logoInner}>
                <Ionicons name="shield-checkmark" size={40} color={PRIMARY} />
              </View>
            </View>
            <Text style={s.appName}>ShieldHer</Text>
            <Text style={s.tagline}>ADVANCED SAFETY ECOSYSTEM</Text>
          </Animated.View>

          {/* Glassmorphic Login Card */}
          <Animated.View style={[s.card, { opacity: fadeCard, transform: [{ translateY: slideCard }] }]}>
            
            <View style={s.modeSwitcher}>
               <TouchableOpacity style={[s.modeBtn, mode === "signin" && s.modeBtnActive]} onPress={() => setMode("signin")}>
                 <Text style={[s.modeText, mode === "signin" && { color: "white" }]}>Sign In</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[s.modeBtn, mode === "signup" && s.modeBtnActive]} onPress={() => setMode("signup")}>
                 <Text style={[s.modeText, mode === "signup" && { color: "white" }]}>Join Pro</Text>
               </TouchableOpacity>
            </View>

            <View style={s.form}>
              {/* Email Field */}
              <View style={s.inputBox}>
                <Text style={s.label}>SECURE EMAIL</Text>
                <View style={s.inputRow}>
                   <Ionicons name="mail" size={16} color={PRIMARY} />
                   <TextInput 
                     style={s.input} 
                     value={email} 
                     onChangeText={setEmail} 
                     placeholder="sarah@shieldher.com" 
                     placeholderTextColor="#4b5563"
                     autoCapitalize="none"
                   />
                </View>
              </View>

              {/* Password Field */}
              <View style={s.inputBox}>
                <Text style={s.label}>ENCRYPTED PASSWORD</Text>
                <View style={s.inputRow}>
                   <Ionicons name="lock-closed" size={16} color={PRIMARY} />
                   <TextInput 
                     style={s.input} 
                     value={password} 
                     onChangeText={setPassword} 
                     placeholder="••••••••" 
                     placeholderTextColor="#4b5563"
                     secureTextEntry={!showPass}
                   />
                   <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                     <Ionicons name={showPass ? "eye-off" : "eye"} size={16} color={SUBTEXT} />
                   </TouchableOpacity>
                </View>
              </View>

              {errorMsg && <Text style={s.error}>{errorMsg}</Text>}
              {successMsg && <Text style={s.success}>{successMsg}</Text>}

              {/* Action Button */}
              {loading ? (
                <ActivityIndicator color={PRIMARY} style={{ marginVertical: 10 }} />
              ) : (
                <TouchableOpacity style={s.ctaContainer} onPress={mode === "signin" ? signIn : signUp} activeOpacity={0.8}>
                   <LinearGradient colors={[PRIMARY, PINK]} start={{x:0, y:0}} end={{x:1, y:1}} style={s.cta}>
                      <Text style={s.ctaText}>{mode === "signin" ? "AUTHENTICATE" : "GET STARTED"}</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                   </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.footer}>
               <Ionicons name="finger-print" size={12} color="#4b5563" />
               <Text style={s.footerText}>SECURED BY SUPABASE & AES-256</Text>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG_BOT },
  kav:            { flex: 1 },
  scroll:         { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingTop: 40 },
  
  blob1:          { position: "absolute", top: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(139,92,246,0.06)" },
  blob2:          { position: "absolute", bottom: 0, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(236,72,153,0.04)" },

  brand:          { alignItems: "center", marginBottom: 35 },
  logoGlow:       { width: 90, height: 90, borderRadius: 30, backgroundColor: "rgba(139,92,246,0.05)", borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOpacity: 0.2, shadowRadius: 20 },
  logoInner:      { width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(139,92,246,0.12)", alignItems: "center", justifyContent: "center" },
  appName:        { color: TEXT, fontSize: 36, fontWeight: "900", letterSpacing: -1, marginTop: 12 },
  tagline:        { color: PRIMARY, fontSize: 10, fontWeight: "800", letterSpacing: 2, marginTop: 4 },

  card:           { backgroundColor: CARD, borderRadius: 32, borderWidth: 1, borderColor: BORDER, padding: 24, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 },
  
  modeSwitcher:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modeBtn:        { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 15 },
  modeBtnActive:  { backgroundColor: PRIMARY },
  modeText:       { color: SUBTEXT, fontSize: 13, fontWeight: "700" },

  form:           { gap: 18 },
  inputBox:       { gap: 8 },
  label:          { color: SUBTEXT, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  inputRow:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: INPUT_BG, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  input:          { flex: 1, color: TEXT, fontSize: 15, fontWeight: "500" },

  error:          { color: "#ef4444", fontSize: 12, fontWeight: "600", textAlign: "center" },
  success:        { color: "#34d399", fontSize: 12, fontWeight: "600", textAlign: "center" },

  ctaContainer:   { borderRadius: 18, overflow: "hidden", marginTop: 8 },
  cta:            { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  ctaText:        { color: "white", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },

  footer:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 },
  footerText:     { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
