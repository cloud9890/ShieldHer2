// screens/HomeScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, Animated,
  Alert, Vibration, ScrollView, Platform, TouchableOpacity,
  Dimensions, StatusBar
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  sendSOSAlert, startEvidenceRecording, registerForPushNotifications,
  startShakeDetection, stopShakeDetection,
  startBackgroundGuardian, stopBackgroundGuardian, setGlobalShakeCallback
} from "../services/sos";

const { width, height } = Dimensions.get("window");

// Haptics — native only
const triggerHaptic = () => {
  if (Platform.OS === "web") return;
  try { require("expo-haptics").notificationAsync(require("expo-haptics").NotificationFeedbackType.Error); } catch {}
};

const CONTACTS = [
  { name: "Mom",         phone: process.env.EXPO_PUBLIC_TWILIO_VERIFIED_NUMBER || "+918310661631" },
  { name: "Sister Riya", phone: "+91-91234-56789" },
];
const COMMUNITY_ALERTS = [
  { text: "Poorly lit street on MG Road",           time: "12 min ago", level: "orange" },
  { text: "Suspicious activity near Sector 14 park", time: "1 hr ago",  level: "red"    },
];

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

// ── Fake Call — Google Dialer Style ──────────────────────────────────────────
function FakeCallScreen({ onDismiss }) {
  const [phase,  setPhase]  = useState("ringing"); // "ringing" | "active"
  const [secs,   setSecs]   = useState(0);
  const [muted,  setMuted]  = useState(false);
  const [speaker,setSpeaker]= useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef(null);
  const CALLER    = CONTACTS[0];

  // Pulse animation on avatar ring while ringing
  useEffect(() => {
    if (phase !== "ringing") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // Timer when call is active
  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => setSecs(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const answer  = () => setPhase("active");
  const decline = () => onDismiss();
  const hangUp  = () => onDismiss();

  return (
    <View style={fc.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111214" />

      {/* Carrier / status bar area */}
      <View style={fc.topBar}>
        <Text style={fc.carrier}>Jio IN</Text>
        <Text style={fc.callStatus}>{phase === "ringing" ? "Incoming call" : formatTime(secs)}</Text>
      </View>

      {/* Avatar + name */}
      <View style={fc.centerArea}>
        {/* Outer pulse ring — only while ringing */}
        {phase === "ringing" && (
          <Animated.View style={[fc.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
        )}
        {/* Avatar circle */}
        <View style={fc.avatarCircle}>
          <Ionicons name="person" size={64} color="#b0b8c4" />
        </View>
        <Text style={fc.callerName}>{CALLER.name}</Text>
        <Text style={fc.callerPhone}>{CALLER.phone}</Text>
        {phase === "ringing" && <Text style={fc.ringLabel}>ShieldHer Fake Call</Text>}
        {phase === "active"  && <Text style={fc.activeLabel}>On call</Text>}
      </View>

      {/* Mid buttons row (mute, keypad, speaker, add) — visible when active */}
      {phase === "active" && (
        <View style={fc.midBtns}>
          {[
            { icon: muted   ? "mic-off"     : "mic-outline",          label: muted   ? "Unmute" : "Mute",    active: muted,   onPress: () => setMuted(m => !m)    },
            { icon: "keypad-outline",                                  label: "Keypad",                        active: false,   onPress: () => {}                   },
            { icon: speaker ? "volume-high" : "volume-high-outline",  label: speaker ? "Speaker" : "Speaker", active: speaker, onPress: () => setSpeaker(s => !s)  },
            { icon: "person-add-outline",                              label: "Add call",                      active: false,   onPress: () => {}                   },
          ].map(btn => (
            <TouchableOpacity key={btn.label} style={[fc.midBtn, btn.active && fc.midBtnActive]} onPress={btn.onPress}>
              <Ionicons name={btn.icon} size={22} color={btn.active ? "#1c1c1e" : "#e1e1e6"} />
              <Text style={[fc.midBtnLabel, btn.active && { color: "#1c1c1e" }]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bottom action buttons */}
      <View style={fc.bottomRow}>
        {/* Left: message / decline */}
        <View style={fc.bottomItemWrap}>
          {phase === "ringing" ? (
            <TouchableOpacity style={[fc.bigBtn, fc.declineBtn]} onPress={decline}>
              <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[fc.bigBtn, fc.endBtn]} onPress={hangUp}>
              <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>
          )}
          <Text style={fc.bigBtnLabel}>{phase === "ringing" ? "Decline" : "End"}</Text>
        </View>

        {/* Middle: message (ringing only) */}
        {phase === "ringing" && (
          <View style={fc.bottomItemWrap}>
            <TouchableOpacity style={[fc.bigBtn, fc.messageBtn]}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color="white" />
            </TouchableOpacity>
            <Text style={fc.bigBtnLabel}>Message</Text>
          </View>
        )}

        {/* Right: answer / speaker toggle */}
        <View style={fc.bottomItemWrap}>
          {phase === "ringing" ? (
            <TouchableOpacity style={[fc.bigBtn, fc.answerBtn]} onPress={answer}>
              <Ionicons name="call" size={30} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[fc.bigBtn, fc.speakerBtn, speaker && fc.speakerActive]} onPress={() => setSpeaker(s => !s)}>
              <Ionicons name="volume-high" size={26} color={speaker ? "#1c1c1e" : "white"} />
            </TouchableOpacity>
          )}
          <Text style={fc.bigBtnLabel}>{phase === "ringing" ? "Accept" : speaker ? "Speaker" : "Speaker"}</Text>
        </View>
      </View>
    </View>
  );
}

// ── SOS Active overlay ────────────────────────────────────────────────────────
function SOSActiveScreen({ location, onCancel, glowAnim }) {
  return (
    <View style={s.sosBg}>
      <Animated.View style={[s.sosGlow, { opacity: glowAnim }]} />
      <Ionicons name="alert-circle" size={72} color="#ef4444" />
      <Text style={s.sosActiveTitle}>SOS ACTIVATED</Text>
      <View style={s.sosActiveCard}>
        {["Live location sent to contacts", "SMS alert dispatched", "Recording started", "Nearest police notified"].map((t, i) => (
          <View key={i} style={s.sosItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={s.sosItemText}>{t}</Text>
          </View>
        ))}
      </View>
      {location && (
        <Text style={s.sosCoords}>
          <Ionicons name="location" size={12} color="#a78bfa" /> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      )}
      <TouchableOpacity style={s.cancelSosBtn} onPress={onCancel}>
        <Text style={s.cancelSosBtnText}>I'm Safe — Cancel SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main HomeScreen ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [sosActive,   setSosActive]   = useState(false);
  const [fakeCall,    setFakeCall]    = useState(false);
  const [guardianOn,  setGuardianOn]  = useState(true);
  const [location,    setLocation]    = useState(null);
  const [shakeBadge,  setShakeBadge]  = useState(false);
  const [pressing,    setPressing]    = useState(false);

  const progressVal = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const glowAnim     = useRef(new Animated.Value(0.4)).current;
  const intervalRef  = useRef(null);

  // Guardian / shake setup
  useEffect(() => {
    const onShake = () => { triggerHaptic(); activateSOS(); };
    if (guardianOn) {
      setGlobalShakeCallback(onShake);
      startShakeDetection(onShake);
      startBackgroundGuardian(onShake);
      setShakeBadge(true);
    } else {
      stopShakeDetection();
      stopBackgroundGuardian();
      setShakeBadge(false);
    }
  }, [guardianOn]);

  // Boot animations
  useEffect(() => {
    registerForPushNotifications().catch(() => {});
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ]));
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
    ]));
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(loc.coords);
    return loc.coords;
  };

  const activateSOS = async () => {
    if (sosActive) return;
    Vibration.vibrate([0, 200, 100, 200, 100, 400]);
    setSosActive(true);
    clearInterval(intervalRef.current);
    progressVal.setValue(0);
    setPressing(false);
    await getLocation();
    sendSOSAlert(CONTACTS, "sos").catch(e => console.error("SOS:", e));
    startEvidenceRecording().catch(() => {});
  };

  // ── SOS press: use interval to drive progress, fire at 100% ──────────────
  const onSOSPressIn = () => {
    setPressing(true);
    progressVal.setValue(0);
    const startTime = Date.now();
    const DURATION  = 2800;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct     = Math.min(elapsed / DURATION, 1);
      progressVal.setValue(pct);
      if (pct >= 1) {
        clearInterval(intervalRef.current);
        activateSOS();
      }
    }, 16); // ~60fps
  };

  const onSOSPressOut = () => {
    clearInterval(intervalRef.current);
    setPressing(false);
    // Animate back to 0
    Animated.timing(progressVal, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };

  const ringColor = progressVal.interpolate({ inputRange: [0, 1], outputRange: ["rgba(239,68,68,0)", "rgba(239,68,68,0.45)"] });
  const ringWidth = progressVal.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  // ── Overlay screens ───────────────────────────────────────────────────────
  if (fakeCall) return <FakeCallScreen onDismiss={() => setFakeCall(false)} />;
  if (sosActive) return (
    <SOSActiveScreen
      location={location}
      glowAnim={glowAnim}
      onCancel={() => { setSosActive(false); progressVal.setValue(0); }}
    />
  );

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Header — fixed above scroll */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <View>
            <Text style={s.greeting}>Good evening,</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={s.headerTitle}>Stay Safe</Text>
              <Ionicons name="heart" size={18} color={PINK} />
            </View>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Guardian badge */}
      <TouchableOpacity style={s.guardianCard} onPress={() => setGuardianOn(g => !g)} activeOpacity={0.8}>
        <View style={s.guardianLeft}>
          <Animated.View style={[s.guardianDot, {
            backgroundColor: guardianOn ? "#4ade80" : "#4b5563",
            transform: guardianOn ? [{ scale: pulseAnim }] : [],
          }]} />
          <View>
            <Text style={s.guardianLabel}>Guardian Mode</Text>
            <Text style={[s.guardianStatus, { color: guardianOn ? "#4ade80" : "#6b7280" }]}>
              {guardianOn ? "Active & Monitoring" : "Tap to enable"}
            </Text>
          </View>
        </View>
        <View style={[s.guardianToggle, { backgroundColor: guardianOn ? "#4ade80" : "#374151" }]}>
          <View style={[s.guardianThumb, { alignSelf: guardianOn ? "flex-end" : "flex-start" }]} />
        </View>
      </TouchableOpacity>

      {/* ── SOS Section — NOT inside ScrollView (avoids scroll conflict) ── */}
      <View style={s.sosSection}>
        <View style={s.sosRingOuter}>
          <Animated.View style={[s.sosRingMid, { opacity: glowAnim }]} />
          <View style={s.sosRing}>
            {/* Fill ring driven by interval */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: ringColor, borderRadius: 999 }]} />
            <Pressable
              style={s.sosBtn}
              onPressIn={onSOSPressIn}
              onPressOut={onSOSPressOut}
              onLongPress={activateSOS}
              delayLongPress={2800}
            >
              <Text style={s.sosBtnLabel}>SOS</Text>
              <Text style={s.sosBtnSub}>{pressing ? "…" : "Hold 3s"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.sosProgressTrack}>
          <Animated.View style={[s.sosProgressFill, { width: ringWidth }]} />
        </View>
        <Text style={s.sosHint}>Hold to send emergency alert · Shake phone 5× for instant SOS</Text>

        {/* Fake call button */}
        <TouchableOpacity style={s.fakeCallBtn} onPress={() => setFakeCall(true)}>
          <Ionicons name="call" size={15} color={PRIMARY} />
          <Text style={s.fakeCallBtnText}>Trigger Fake Call</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable alerts below SOS — scroll is below the SOS so no conflict */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: BG },
  header:           { backgroundColor: "#12082a", paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20 },
  headerInner:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting:         { color: "#7c3aed", fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  headerTitle:      { color: TEXT, fontSize: 26, fontWeight: "800", marginTop: 2 },
  notifBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(139,92,246,0.12)", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  guardianCard:     { marginHorizontal: 16, marginTop: 14, backgroundColor: CARD, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BORDER },
  guardianLeft:     { flexDirection: "row", alignItems: "center", gap: 12 },
  guardianDot:      { width: 12, height: 12, borderRadius: 6 },
  guardianLabel:    { color: TEXT, fontSize: 14, fontWeight: "700" },
  guardianStatus:   { fontSize: 11, marginTop: 1 },
  guardianToggle:   { width: 42, height: 24, borderRadius: 12, padding: 2, justifyContent: "center" },
  guardianThumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: "white", elevation: 2 },
  // SOS (outside ScrollView)
  sosSection:       { alignItems: "center", paddingVertical: 20, paddingHorizontal: 20 },
  sosRingOuter:     { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  sosRingMid:       { position: "absolute", width: 196, height: 196, borderRadius: 98, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 2, borderColor: "rgba(239,68,68,0.25)" },
  sosRing:          { width: 164, height: 164, borderRadius: 82, borderWidth: 3, borderColor: "rgba(239,68,68,0.4)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sosBtn:           { width: 148, height: 148, borderRadius: 74, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center", elevation: 12 },
  sosBtnLabel:      { color: "white", fontSize: 30, fontWeight: "900", letterSpacing: 1 },
  sosBtnSub:        { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  sosProgressTrack: { width: 220, height: 4, backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 2, marginTop: 12, overflow: "hidden" },
  sosProgressFill:  { height: 4, backgroundColor: "#ef4444", borderRadius: 2 },
  sosHint:          { fontSize: 11, color: SUBTEXT, textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  fakeCallBtn:      { marginTop: 12, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(139,92,246,0.07)" },
  fakeCallBtnText:  { color: PRIMARY, fontSize: 13, fontWeight: "600" },
  // Alerts
  sectionLabel:     { fontSize: 11, color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10, marginTop: 4 },
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
});

// ── Fake Call Styles (Google Dialer theme) ─────────────────────────────────
const fc = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#111214" },
  topBar:         { paddingTop: 52, paddingHorizontal: 24, paddingBottom: 12, alignItems: "center", gap: 4 },
  carrier:        { color: "#8e9099", fontSize: 12, letterSpacing: 0.3 },
  callStatus:     { color: "#e1e1e6", fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
  centerArea:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  pulseRing:      { position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: "rgba(52,199,89,0.4)", backgroundColor: "rgba(52,199,89,0.06)" },
  avatarCircle:   { width: 110, height: 110, borderRadius: 55, backgroundColor: "#2c2c2e", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#3a3a3c" },
  callerName:     { color: "#f2f2f7", fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  callerPhone:    { color: "#8e9099", fontSize: 15, letterSpacing: 0.3 },
  ringLabel:      { color: "#34c759", fontSize: 13, fontWeight: "600", marginTop: 4 },
  activeLabel:    { color: "#34c759", fontSize: 13, fontWeight: "600", marginTop: 4 },
  // Mid buttons
  midBtns:        { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 20, marginBottom: 28 },
  midBtn:         { width: 70, alignItems: "center", gap: 6, backgroundColor: "#2c2c2e", borderRadius: 18, paddingVertical: 14 },
  midBtnActive:   { backgroundColor: "#e1e1e6" },
  midBtnLabel:    { color: "#8e9099", fontSize: 10, fontWeight: "600" },
  // Bottom row
  bottomRow:      { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingHorizontal: 28, paddingBottom: 52 },
  bottomItemWrap: { alignItems: "center", gap: 10 },
  bigBtn:         { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  bigBtnLabel:    { color: "#8e9099", fontSize: 12 },
  declineBtn:     { backgroundColor: "#ff3b30" },
  answerBtn:      { backgroundColor: "#34c759" },
  endBtn:         { backgroundColor: "#ff3b30" },
  messageBtn:     { backgroundColor: "#2c2c2e" },
  speakerBtn:     { backgroundColor: "#2c2c2e" },
  speakerActive:  { backgroundColor: "#e1e1e6" },
});
