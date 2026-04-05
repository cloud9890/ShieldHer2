// src/components/home/FakeCallScreen.js
// Designed to look exactly like Google Dialer / Android incoming call screen
import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Vibration, Dimensions, StatusBar, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

const CALLER_NAMES = ["Mom 💜", "Priya (Sister)", "Riya Singh", "Emergency Contact"];
const AVATARS = ["P", "R", "M", "E"];
const AVATAR_BG = ["#7c3aed", "#ec4899", "#0ea5e9", "#10b981"];

// Ripple animation component for the accept button
function PulseRing({ color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.3, 0] });
  return (
    <Animated.View style={[styles.pulseRing, { borderColor: color, transform: [{ scale }], opacity }]} />
  );
}

export default function FakeCallScreen({ callerName, onEnd }) {
  const [answered, setAnswered] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const timerRef = useRef(null);
  
  // Pick a random caller / color if not supplied
  const idx = Math.floor(Math.random() * CALLER_NAMES.length);
  const name = callerName || CALLER_NAMES[idx];
  const avatarLetter = name[0].toUpperCase();
  const avatarColor = AVATAR_BG[idx];

  // Vibrate on incoming call (like a real Android phone)
  useEffect(() => {
    if (!answered) {
      const pattern = [0, 500, 500, 500, 500];
      Vibration.vibrate(pattern, true);
    } else {
      Vibration.cancel();
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { Vibration.cancel(); clearInterval(timerRef.current); };
  }, [answered]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleDecline = () => { Vibration.cancel(); onEnd(); };
  const handleAccept  = () => { Vibration.cancel(); setAnswered(true); };
  const handleHangup  = () => { Vibration.cancel(); clearInterval(timerRef.current); onEnd(); };

  if (answered) {
    // ── Active call screen ──────────────────────────────────────────────────
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        {/* Background blur gradient */}
        <View style={[styles.activeBg, { backgroundColor: "#0a1628" }]} />

        {/* Top section */}
        <View style={styles.activeTop}>
          <Text style={styles.activeStatus}>Active Call</Text>
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor + "30", borderColor: avatarColor + "60" }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{avatarLetter}</Text>
          </View>
          <Text style={styles.activeName}>{name}</Text>
          <Text style={styles.activePhone}>Mobile · India</Text>
          <Text style={styles.timer}>{fmt(callDuration)}</Text>
        </View>

        {/* Middle controls (mute, hold, speaker, keypad) */}
        <View style={styles.activeControls}>
          {[
            { icon: muted    ? "mic-off"       : "mic-outline",           label: muted    ? "Unmute"  : "Mute",     onPress: () => setMuted(m => !m),    active: muted    },
            { icon: "keypad-outline",                                      label: "Keypad",                          onPress: () => {},                   active: false    },
            { icon: speaker  ? "volume-high"   : "volume-medium-outline", label: speaker  ? "Speaker" : "Speaker",  onPress: () => setSpeaker(s => !s),  active: speaker  },
            { icon: "person-add-outline",                                  label: "Add Call",                        onPress: () => {},                   active: false    },
          ].map((b, i) => (
            <View key={i} style={styles.controlItem}>
              <TouchableOpacity
                style={[styles.controlBtn, b.active && styles.controlBtnActive]}
                onPress={b.onPress}
              >
                <Ionicons name={b.icon} size={24} color={b.active ? "#fff" : "#d1d5db"} />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Hang up */}
        <View style={styles.hangupRow}>
          <TouchableOpacity style={styles.hangupBtn} onPress={handleHangup}>
            <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Incoming call screen (Google Dialer style) ──────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      
      {/* Dark gradient background */}
      <View style={[styles.incomingBg, { backgroundColor: "#0f1923" }]} />

      {/* Caller info */}
      <View style={styles.callerInfo}>
        <Text style={styles.incomingLabel}>Incoming call</Text>
        <View style={[styles.avatarCircle, { 
          backgroundColor: avatarColor + "25", 
          borderColor: avatarColor + "50",
          width: 104, height: 104, borderRadius: 52 
        }]}>
          <Text style={[styles.avatarText, { color: avatarColor, fontSize: 48, fontWeight: "800" }]}>{avatarLetter}</Text>
        </View>
        <Text style={styles.callerName}>{name}</Text>
        <Text style={styles.callerSub}>Mobile · India</Text>

        {/* Actions row (message, silence etc) */}
        <View style={styles.quickActions}>
          {[
            { icon: "chatbubble-outline", label: "Message" },
            { icon: "volume-mute-outline", label: "Silence" },
          ].map((a, i) => (
            <View key={i} style={styles.quickActionItem}>
              <View style={styles.quickActionBtn}>
                <Ionicons name={a.icon} size={18} color="#9ca3af" />
              </View>
              <Text style={styles.quickActionLabel}>{a.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Accept / Decline buttons — Google Dialer style */}
      <View style={styles.callButtons}>
        {/* Decline */}
        <View style={styles.callBtnWrap}>
          <TouchableOpacity style={[styles.callBtn, styles.declineBtn]} onPress={handleDecline}>
            <Ionicons name="call" size={30} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>
          <Text style={styles.callBtnLabel}>Decline</Text>
        </View>

        {/* Accept — with animated pulse rings */}
        <View style={styles.callBtnWrap}>
          <View style={styles.pulseContainer}>
            <PulseRing color="#34d399" delay={0} />
            <PulseRing color="#34d399" delay={500} />
            <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={handleAccept}>
              <Ionicons name="call" size={30} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.callBtnLabel}>Accept</Text>
        </View>
      </View>

      {/* Slide to answer hint */}
      <Text style={styles.slideHint}>Tap to answer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0f1923" },
  incomingBg:     { ...StyleSheet.absoluteFillObject },
  activeBg:       { ...StyleSheet.absoluteFillObject },

  // Incoming
  callerInfo:     { flex: 1, alignItems: "center", paddingTop: 80, gap: 10 },
  incomingLabel:  { fontSize: 13, color: "#9ca3af", fontWeight: "500", letterSpacing: 0.3, marginBottom: 16 },
  avatarCircle:   { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText:     { fontSize: 36, fontWeight: "800" },
  callerName:     { fontSize: 32, fontWeight: "800", color: "#f9fafb", letterSpacing: -0.5 },
  callerSub:      { fontSize: 14, color: "#6b7280", marginTop: 2 },
  quickActions:   { flexDirection: "row", gap: 32, marginTop: 28 },
  quickActionItem:{ alignItems: "center", gap: 6 },
  quickActionBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  quickActionLabel:{ fontSize: 11, color: "#6b7280" },

  // Call buttons
  callButtons:    { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 40, paddingBottom: 70 },
  callBtnWrap:    { alignItems: "center", gap: 10 },
  pulseContainer: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  pulseRing:      { position: "absolute", width: 72, height: 72, borderRadius: 36, borderWidth: 2 },
  callBtn:        { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", elevation: 8 },
  declineBtn:     { backgroundColor: "#ef4444", shadowColor: "#ef4444", shadowOpacity: 0.6, shadowRadius: 12 },
  acceptBtn:      { backgroundColor: "#34d399", shadowColor: "#34d399", shadowOpacity: 0.6, shadowRadius: 12 },
  callBtnLabel:   { fontSize: 13, color: "#9ca3af", fontWeight: "500" },
  slideHint:      { textAlign: "center", color: "#374151", fontSize: 12, paddingBottom: 24 },

  // Active call
  activeTop:         { flex: 1, alignItems: "center", paddingTop: 56, gap: 8 },
  activeStatus:      { fontSize: 13, color: "#34d399", fontWeight: "600", letterSpacing: 0.5, marginBottom: 12 },
  activeName:        { fontSize: 28, fontWeight: "800", color: "#f9fafb", marginTop: 8 },
  activePhone:       { fontSize: 13, color: "#6b7280" },
  timer:             { fontSize: 36, fontWeight: "900", color: "#34d399", letterSpacing: 2, marginTop: 8 },
  activeControls:    { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 16, justifyContent: "center", marginBottom: 20 },
  controlItem:       { alignItems: "center", gap: 8, width: 72 },
  controlBtn:        { width: 60, height: 60, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  controlBtnActive:  { backgroundColor: "#8b5cf6" },
  controlLabel:      { fontSize: 11, color: "#6b7280" },
  hangupRow:         { alignItems: "center", paddingBottom: 56 },
  hangupBtn:         { width: 72, height: 72, borderRadius: 36, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", shadowColor: "#ef4444", shadowOpacity: 0.6, shadowRadius: 16 },
});
