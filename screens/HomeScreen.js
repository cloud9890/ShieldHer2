// screens/HomeScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Alert, Vibration, ScrollView, Platform
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { sendSOSAlert, startEvidenceRecording, registerForPushNotifications, startShakeDetection, stopShakeDetection } from "../services/sos";

// Haptics is only available on native
const triggerHaptic = () => {
  if (Platform.OS === "web") return;
  try { require("expo-haptics").notificationAsync(require("expo-haptics").NotificationFeedbackType.Error); } catch {}
};

const EMERGENCY_CONTACTS = [
  { name: "Mom",         phone: "+91-98765-43210" },
  { name: "Sister Riya", phone: "+91-91234-56789" },
];

const COMMUNITY_ALERTS = [
  { text: "Poorly lit street on MG Road",           time: "12 min ago", level: "orange" },
  { text: "Suspicious activity near Sector 14 park", time: "1 hr ago",  level: "red"    },
];

const BG        = "#0f0a1e";
const CARD      = "#1a1130";
const BORDER    = "rgba(139,92,246,0.18)";
const PRIMARY   = "#8b5cf6";
const PINK      = "#ec4899";
const TEXT      = "#f1f0f5";
const SUBTEXT   = "#9ca3af";

export default function HomeScreen() {
  const [sosActive, setSosActive]   = useState(false);
  const [fakeCall, setFakeCall]     = useState(false);
  const [guardianOn, setGuardianOn] = useState(true);
  const [location, setLocation]     = useState(null);
  const [shakeBadge, setShakeBadge] = useState(false);
  const pressProgress = useRef(new Animated.Value(0)).current;
  const pressAnim     = useRef(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const glowAnim      = useRef(new Animated.Value(0.4)).current;

  // Shake detection — starts/stops with component (native only)
  useEffect(() => {
    const onShake = () => {
      triggerHaptic();
      activateSOS();
    };
    startShakeDetection(onShake);
    setShakeBadge(true);
    return () => { stopShakeDetection(); setShakeBadge(false); };
  }, []);

  useEffect(() => {
    registerForPushNotifications().catch(() => {});
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    return loc.coords;
  };

  const startPress = () => {
    pressAnim.current = Animated.timing(pressProgress, { toValue: 1, duration: 3000, useNativeDriver: false });
    pressAnim.current.start(({ finished }) => { if (finished) activateSOS(); });
  };
  const cancelPress = () => {
    pressAnim.current?.stop();
    Animated.timing(pressProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const activateSOS = async () => {
    Vibration.vibrate([0, 200, 100, 200]);
    await getLocation();
    setSosActive(true);
    sendSOSAlert(EMERGENCY_CONTACTS, "sos").catch(e => console.error("SOS:", e));
    startEvidenceRecording().catch(() => {});
  };

  const ringColor = pressProgress.interpolate({ inputRange: [0, 1], outputRange: ["rgba(239,68,68,0)", "rgba(239,68,68,0.35)"] });
  const ringWidth = pressProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  // ── Fake Call ─────────────────────────────────────────────
  if (fakeCall) return (
    <View style={s.fcBg}>
      <View style={s.fcTop}>
        <View style={s.fcAvatar}><Text style={{ fontSize: 44 }}>👩</Text></View>
        <Text style={s.fcName}>Mom</Text>
        <Text style={s.fcSub}>Incoming Call…</Text>
      </View>
      <View style={s.fcBtns}>
        <TouchableOpacity style={[s.fcBtn, { backgroundColor: "#ef4444" }]} onPress={() => setFakeCall(false)}>
          <Ionicons name="call" size={28} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.fcBtn, { backgroundColor: "#22c55e" }]} onPress={() => setFakeCall(false)}>
          <Ionicons name="call" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── SOS Active ────────────────────────────────────────────
  if (sosActive) return (
    <View style={s.sosBg}>
      <Animated.View style={[s.sosGlow, { opacity: glowAnim }]} />
      <Text style={{ fontSize: 64 }}>🚨</Text>
      <Text style={s.sosActiveTitle}>SOS ACTIVATED</Text>
      <View style={s.sosActiveCard}>
        {["Live location sent to contacts", "SMS alert dispatched", "Recording started", "Nearest police notified"]
          .map((t, i) => (
            <View key={i} style={s.sosItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
              <Text style={s.sosItemText}>{t}</Text>
            </View>
          ))}
      </View>
      {location && <Text style={s.sosCoords}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
      <TouchableOpacity style={s.cancelSosBtn} onPress={() => { setSosActive(false); pressProgress.setValue(0); }}>
        <Text style={s.cancelSosBtnText}>I'm Safe — Cancel SOS</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Main ──────────────────────────────────────────────────
  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <View>
            <Text style={s.greeting}>Good evening,</Text>
            <Text style={s.headerTitle}>Stay Safe 💜</Text>
          </View>
          <View style={s.notifBtn}>
            <Ionicons name="notifications" size={20} color={PRIMARY} />
          </View>
        </View>
      </View>

      {/* Guardian Badge */}
      <TouchableOpacity style={s.guardianCard} onPress={() => setGuardianOn(g => !g)} activeOpacity={0.8}>
        <View style={s.guardianLeft}>
          <Animated.View style={[s.guardianDot, { backgroundColor: guardianOn ? "#4ade80" : "#4b5563", transform: guardianOn ? [{ scale: pulseAnim }] : [] }]} />
          <View>
            <Text style={s.guardianLabel}>Guardian Mode</Text>
            <Text style={[s.guardianStatus, { color: guardianOn ? "#4ade80" : "#6b7280" }]}>{guardianOn ? "Active & Monitoring" : "Tap to enable"}</Text>
          </View>
        </View>
        <View style={[s.guardianToggle, { backgroundColor: guardianOn ? "#4ade80" : "#374151" }]}>
          <View style={[s.guardianThumb, { alignSelf: guardianOn ? "flex-end" : "flex-start" }]} />
        </View>
      </TouchableOpacity>

      {/* SOS Button */}
      <View style={s.sosSection}>
        <View style={s.sosRingOuter}>
          <Animated.View style={[s.sosRingMid, { opacity: glowAnim }]} />
          <View style={s.sosRing}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: ringColor, borderRadius: 999 }]} />
            <TouchableOpacity
              style={s.sosBtn}
              onPressIn={startPress}
              onPressOut={cancelPress}
              activeOpacity={0.9}
            >
              <Text style={s.sosBtnLabel}>SOS</Text>
              <Text style={s.sosBtnSub}>Hold 3s</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress arc (linear under button) */}
        <View style={s.sosProgressTrack}>
          <Animated.View style={[s.sosProgressFill, { width: ringWidth }]} />
        </View>
        <Text style={s.sosHint}>Hold to send emergency alert to your contacts</Text>

        <TouchableOpacity style={s.fakeCallBtn} onPress={() => setFakeCall(true)}>
          <Ionicons name="call" size={15} color={PRIMARY} />
          <Text style={s.fakeCallBtnText}>Trigger Fake Call</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      <Text style={s.sectionLabel}>Community Alerts Nearby</Text>
      {COMMUNITY_ALERTS.map((a, i) => (
        <View key={i} style={s.alertCard}>
          <View style={[s.alertDot, { backgroundColor: a.level === "red" ? "#ef4444" : "#f97316" }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertText}>{a.text}</Text>
            <Text style={s.alertTime}>{a.time}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#4b5563" />
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BG },
  // Header
  header:           { backgroundColor: "#12082a", paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerInner:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting:         { color: "#7c3aed", fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  headerTitle:      { color: TEXT, fontSize: 26, fontWeight: "800", marginTop: 2 },
  notifBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(139,92,246,0.12)", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  // Guardian
  guardianCard:     { marginHorizontal: 16, marginTop: 16, backgroundColor: CARD, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BORDER },
  guardianLeft:     { flexDirection: "row", alignItems: "center", gap: 12 },
  guardianDot:      { width: 12, height: 12, borderRadius: 6 },
  guardianLabel:    { color: TEXT, fontSize: 14, fontWeight: "700" },
  guardianStatus:   { fontSize: 11, marginTop: 1 },
  guardianToggle:   { width: 42, height: 24, borderRadius: 12, padding: 2, justifyContent: "center" },
  guardianThumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: "white", elevation: 2 },
  // SOS
  sosSection:       { alignItems: "center", paddingVertical: 32, paddingHorizontal: 20 },
  sosRingOuter:     { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  sosRingMid:       { position: "absolute", width: 196, height: 196, borderRadius: 98, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 2, borderColor: "rgba(239,68,68,0.25)" },
  sosRing:          { width: 164, height: 164, borderRadius: 82, borderWidth: 3, borderColor: "rgba(239,68,68,0.4)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sosBtn:           { width: 148, height: 148, borderRadius: 74, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center", elevation: 12 },
  sosBtnLabel:      { color: "white", fontSize: 30, fontWeight: "900", letterSpacing: 1 },
  sosBtnSub:        { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  sosProgressTrack: { width: 220, height: 4, backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 2, marginTop: 14, overflow: "hidden" },
  sosProgressFill:  { height: 4, backgroundColor: "#ef4444", borderRadius: 2 },
  sosHint:          { fontSize: 12, color: SUBTEXT, textAlign: "center", marginTop: 10 },
  fakeCallBtn:      { marginTop: 14, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(139,92,246,0.07)" },
  fakeCallBtnText:  { color: PRIMARY, fontSize: 13, fontWeight: "600" },
  // Alerts
  sectionLabel:     { fontSize: 11, color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10 },
  alertCard:        { backgroundColor: CARD, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  alertDot:         { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  alertText:        { fontSize: 13, color: TEXT },
  alertTime:        { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  // SOS Active
  sosBg:            { flex: 1, backgroundColor: "#1a0505", alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  sosGlow:          { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(220,38,38,0.2)", top: "25%" },
  sosActiveTitle:   { color: "#fca5a5", fontSize: 28, fontWeight: "900", letterSpacing: 2 },
  sosActiveCard:    { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18, padding: 18, width: "100%", gap: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  sosItem:          { flexDirection: "row", alignItems: "center", gap: 10 },
  sosItemText:      { color: "white", fontSize: 14 },
  sosCoords:        { color: "#fca5a5", fontSize: 11 },
  cancelSosBtn:     { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 36, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  cancelSosBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  // Fake Call
  fcBg:      { flex: 1, backgroundColor: "#080c10", alignItems: "center", justifyContent: "space-between", paddingVertical: 64 },
  fcTop:     { alignItems: "center", gap: 12 },
  fcAvatar:  { width: 92, height: 92, borderRadius: 46, backgroundColor: "#1a2332", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(99,102,241,0.3)" },
  fcName:    { color: TEXT, fontSize: 26, fontWeight: "700" },
  fcSub:     { color: "#34d399", fontSize: 14, letterSpacing: 0.5 },
  fcBtns:    { flexDirection: "row", gap: 52 },
  fcBtn:     { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
});
