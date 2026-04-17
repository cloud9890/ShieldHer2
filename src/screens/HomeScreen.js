// src/screens/HomeScreen.js
// Main dashboard — SOS, Guardian Mode, Community Alerts, Quick Actions
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Alert, Vibration, ScrollView, Image, Platform
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BG, CARD, BORDER, PRIMARY, PINK, DANGER, SUCCESS, WARNING, TEXT, SUBTEXT, MUTED } from "../theme/colors";
import useAuth from "../hooks/useAuth";
import useContacts from "../hooks/useContacts";
import useCommunityReports from "../hooks/useCommunityReports";
import {
  sendSOSAlert, startEvidenceRecording, stopEvidenceRecording,
  registerForPushNotifications,
  startShakeDetection, stopShakeDetection, startBackgroundGuardian,
  stopBackgroundGuardian, setGlobalShakeCallback,
  startAutoDangerDetection, stopAutoDangerDetection, cancelAutoSOS,
} from "../api/sos";

import SOSButton       from "../components/home/SOSButton";
import GuardianBadge   from "../components/home/GuardianBadge";
import FakeCallScreen  from "../components/home/FakeCallScreen";
import { getSituationBriefing } from "../api/gemini";

const AVATAR_COLORS = ["#7c3aed","#0ea5e9","#ec4899","#f59e0b","#10b981"];

const DANGER_REASONS = {
  impact:             "Sudden impact detected! Are you okay?",
  panic_run:          "Rapid movement detected! Are you safe?",
  forced_vehicle:     "High-speed movement at night detected!",
  impact_confirmed:   "Auto-SOS triggered by impact detection.",
  panic_run_confirmed:"Auto-SOS triggered by panic detection.",
  forced_vehicle_confirmed: "Auto-SOS triggered by speed detection.",
};

const REPORT_CATEGORIES = {
  "Suspicious Person": { icon: "eye-outline", color: "#f87171" },
  "Poor Lighting":     { icon: "flashlight-outline", color: "#fbbf24" },
  "Unsafe Area":       { icon: "warning-outline", color: "#fb923c" },
  "Harassment":        { icon: "megaphone-outline", color: "#f472b6" },
  "Other":             { icon: "alert-circle-outline", color: "#a78bfa" },
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ✅ Data hooks (replace inline Supabase + AsyncStorage calls)
  const { profile: authProfile, user }  = useAuth();
  const { contacts: circleContacts }    = useContacts();
  const { reports: communityAlerts }    = useCommunityReports(5);

  const [sosActive, setSosActive]     = useState(false);
  const [fakeCall, setFakeCall]       = useState(false);
  const [guardianOn, setGuardianOn]   = useState(true);
  const [location, setLocation]       = useState(null);
  const [profile, setProfile]         = useState({ name: "User", phone: "" });
  const [imageUri, setImageUri]       = useState(null);
  const [dangerAlert, setDangerAlert] = useState(null);
  const [autoSOSCountdown, setAutoSOSCountdown] = useState(10);
  const [advisorBrief, setAdvisorBrief] = useState(null);

  // Situation Advisor (AI-1)
  useEffect(() => {
    if (!location) return;
    (async () => {
      try {
        const h = new Date().getHours();
        const timeOfDay = h < 6 ? "late night" : h < 18 ? "daytime" : "evening/night";
        const alertsText = communityAlerts.length > 0 ? `${communityAlerts.length} community reports nearby.` : "No immediate community reports.";
        const ctx = `User is at ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}. Time is ${timeOfDay}. ${alertsText}`;
        const brief = await getSituationBriefing(ctx);
        if (brief && brief.briefing) setAdvisorBrief(brief);
      } catch (e) {}
    })();
  }, [location, communityAlerts]);

  // Derive SOS contacts from Supabase-backed circle (falls back to env)
  const sosContacts = circleContacts.length > 0
    ? circleContacts.map(c => ({ name: c.name, phone: c.phone }))
    : [{ name: "Emergency", phone: process.env.EXPO_PUBLIC_TWILIO_VERIFIED_NUMBER || "+918310661631" }];

  const pressProgress = useRef(new Animated.Value(0)).current;
  const pressAnim     = useRef(null);
  const glowAnim      = useRef(new Animated.Value(0.4)).current;
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const ring3 = useRef(new Animated.Value(1)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.4)).current;
  const ringOpacity3 = useRef(new Animated.Value(0.2)).current;
  const countdownRef = useRef(null);

  // Sync profile data from auth hook
  useEffect(() => {
    if (authProfile) {
      setProfile({ name: authProfile.name || "User", phone: authProfile.phone || "" });
      if (authProfile.avatar_url) setImageUri(authProfile.avatar_url);
      setGuardianOn(authProfile.guard_on ?? true);
    }
  }, [authProfile]);

  useEffect(() => {
    registerForPushNotifications().catch(() => {});
    startRingAnimations();
    startGlowAnim();
    startPulseAnim();
    return () => {
      ring1.stopAnimation(); ring2.stopAnimation(); ring3.stopAnimation();
      glowAnim.stopAnimation(); pulseAnim.stopAnimation();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);


  const startRingAnimations = () => {
    const makeRing = (scale, opacity, delay, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.8, duration, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6 - delay / 5000, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
    makeRing(ring1, ringOpacity1, 0,    1600).start();
    makeRing(ring2, ringOpacity2, 500,  1600).start();
    makeRing(ring3, ringOpacity3, 1000, 1600).start();
  };

  const startGlowAnim = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  const startPulseAnim = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  // ── Shake + auto-danger detection wiring ────────────────────────────────
  useEffect(() => {
    const onShake = () => { Vibration.vibrate(200); activateSOS(); };
    const onDanger = (reason, cancelFn) => {
      if (reason.endsWith("_confirmed")) {
        activateSOS();
        setDangerAlert(null);
      } else {
        setDangerAlert({ reason, cancelFn });
        setAutoSOSCountdown(10);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setAutoSOSCountdown(c => {
            if (c <= 1) { clearInterval(countdownRef.current); return 0; }
            return c - 1;
          });
        }, 1000);
      }
    };

    if (guardianOn) {
      setGlobalShakeCallback(onShake);
      startShakeDetection(onShake);
      startBackgroundGuardian(onShake);
      startAutoDangerDetection(onDanger);
    } else {
      stopShakeDetection();
      stopBackgroundGuardian();
      stopAutoDangerDetection();
      setDangerAlert(null);
    }
    return () => {
      stopShakeDetection();
      stopAutoDangerDetection();
    };
  }, [guardianOn]);

  // ── SOS Activation ──────────────────────────────────────────────────────
  const activateSOS = async () => {
    Vibration.vibrate([0, 200, 100, 200]);
    let coords = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = loc.coords;
        setLocation(coords);
      }
    } catch (_) {}
    setSosActive(true);
    sendSOSAlert(sosContacts, "sos", coords).catch(e => {
      console.error("SOS:", e);
      Alert.alert("SOS Protocol Failed", `Network layer rejected dispatch: ${e.message}\nPlease physically call emergency services immediately.`);
    });
    startEvidenceRecording().catch(e => {
      console.error("Recording:", e);
      Alert.alert("Evidence Fault", "Failed to boot microphone buffer. Please verify security permissions.");
    });
  };

  // ── Cancel SOS + auto-save recording to Vault ───────────────────────────
  const cancelSOS = async () => {
    setSosActive(false);
    pressProgress.setValue(0);
    // Try to stop recording and save to Vault
    try {
      const recordingUri = await stopEvidenceRecording();
      if (recordingUri) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Upload audio to evidence bucket
          const fileName = `${user.id}/sos_audio_${Date.now()}.m4a`;
          const res = await fetch(recordingUri);
          const buffer = await res.arrayBuffer();
          const { error: upErr } = await supabase.storage
            .from("evidence")
            .upload(fileName, buffer, { contentType: "audio/mp4", upsert: false });

          let mediaUrl = null;
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(fileName);
            mediaUrl = urlData?.publicUrl || null;
          }

          // Create incident record
          await supabase.from("incidents").insert({
            user_id: user.id,
            type: "SOS Recording",
            description: "Auto-saved audio recording from SOS activation.",
            location: location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : null,
            media_url: mediaUrl,
          });
          Alert.alert("📁 Recording Saved", "The SOS audio recording has been saved to your Evidence Vault.");
        }
      }
    } catch (e) {
      console.warn("Auto-save recording:", e.message);
    }
  };

  const cancelDangerAlert = () => {
    dangerAlert?.cancelFn?.();
    cancelAutoSOS();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDangerAlert(null);
  };

  // ── Toggle guardian + persist ───────────────────────────────────────────
  const toggleGuardian = async () => {
    const next = !guardianOn;
    setGuardianOn(next);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({ id: user.id, guard_on: next, updated_at: new Date() });
      }
    } catch (_) {}
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const avatarColor = AVATAR_COLORS[(profile.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials    = profile.name?.trim().split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "SH";
  const timeGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "GOOD MORNING,";
    if (h < 17) return "GOOD AFTERNOON,";
    return "GOOD EVENING,";
  })();

  const formatTimeAgo = (iso) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hr ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch { return ""; }
  };

  // ── Render: Fake Call overlay ──────────────────────────────
  if (fakeCall) return (
    <FakeCallScreen callerName="Mom 💜" onEnd={() => setFakeCall(false)} />
  );

  // ── Render: SOS Active screen ──────────────────────────────
  if (sosActive) return (
    <View style={s.sosBg}>
      <Animated.View style={[s.sosGlow, { opacity: glowAnim }]} />
      <Ionicons name="alert-circle" size={72} color={DANGER} />
      <Text style={s.sosActiveTitle}>SOS ACTIVATED</Text>
      <View style={s.sosActiveCard}>
        {["Live location sent to contacts", "SMS alert dispatched", "Recording started", "Emergency services notified"]
          .map((t, i) => (
            <View key={i} style={s.sosItem}>
              <Ionicons name="checkmark-circle" size={16} color={SUCCESS} />
              <Text style={s.sosItemText}>{t}</Text>
            </View>
          ))}
      </View>
      {location && (
        <Text style={s.sosCoords}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>
      )}
      <TouchableOpacity style={s.cancelSosBtn} onPress={cancelSOS}>
        <Text style={s.cancelSosBtnText}>I'm Safe — Cancel SOS</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: Auto-danger warning overlay ───────────────────
  if (dangerAlert) return (
    <View style={s.dangerBg}>
      <View style={s.dangerCard}>
        <Text style={s.dangerEmoji}>⚠️</Text>
        <Text style={s.dangerTitle}>Danger Detected!</Text>
        <Text style={s.dangerBody}>{DANGER_REASONS[dangerAlert.reason] || "Possible danger detected."}</Text>
        <Text style={s.dangerCountdown}>Auto-SOS in {autoSOSCountdown}s</Text>
        <TouchableOpacity style={s.dangerCancelBtn} onPress={cancelDangerAlert}>
          <Text style={s.dangerCancelText}>I'm Safe — Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.dangerSOSBtn} onPress={() => { cancelDangerAlert(); activateSOS(); }}>
          <Text style={s.dangerSOSText}>Activate SOS Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main Screen ────────────────────────────────────────────
  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header — paddingTop from safe area insets (notch-safe) */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{timeGreeting}</Text>
            <Text style={s.headerTitle}>Stay Safe, {profile.name.split(" ")[0]} 💜</Text>
          </View>
          <TouchableOpacity
            style={s.profileThumb}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={s.thumbImg} />
            ) : (
              <View style={[s.thumbInitials, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[s.thumbText, { color: avatarColor }]}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Guardian Mode — now uses extracted component */}
      <GuardianBadge
        guardianOn={guardianOn}
        onPress={toggleGuardian}
        pulseAnim={pulseAnim}
      />

      {/* SOS Section */}
      <View style={s.sosSection}>
        <Animated.View style={[s.ring, s.ring3, { transform: [{ scale: ring3 }], opacity: ringOpacity3 }]} />
        <Animated.View style={[s.ring, s.ring2, { transform: [{ scale: ring2 }], opacity: ringOpacity2 }]} />
        <Animated.View style={[s.ring, s.ring1, { transform: [{ scale: ring1 }], opacity: ringOpacity1 }]} />

        <SOSButton
          onPressIn={() => {
            pressAnim.current = Animated.timing(pressProgress, { toValue: 1, duration: 3000, useNativeDriver: false });
            pressAnim.current.start(({ finished }) => { if (finished) activateSOS(); });
          }}
          onPressOut={() => {
            pressAnim.current?.stop();
            Animated.timing(pressProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
          }}
          glowAnim={glowAnim}
          pressProgress={pressProgress}
        />
      </View>

      {/* Fake Call Button */}
      <TouchableOpacity style={s.fakeCallBtn} onPress={() => setFakeCall(true)} activeOpacity={0.8}>
        <Ionicons name="call-outline" size={16} color={SUBTEXT} />
        <Text style={s.fakeCallBtnText}>Trigger Fake Call</Text>
      </TouchableOpacity>

      {/* AI Situation Advisor */}
      {advisorBrief && (
        <View style={s.advisorCard}>
          <View style={s.advisorHeader}>
            <Ionicons name="sparkles" size={14} color={PINK} />
            <Text style={s.advisorTitle}>AI SITUATION ADVISOR</Text>
            <View style={{ flex: 1 }} />
            <View style={[s.riskBadge, { backgroundColor: advisorBrief.riskLevel === 'high' ? "rgba(239,68,68,0.15)" : advisorBrief.riskLevel === 'moderate' ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)" }]}>
               <Text style={[s.riskBadgeText, { color: advisorBrief.riskLevel === 'high' ? DANGER : advisorBrief.riskLevel === 'moderate' ? WARNING : SUCCESS }]}>
                 {advisorBrief.riskLevel?.toUpperCase()} RISK
               </Text>
            </View>
          </View>
          <Text style={s.advisorText}>{advisorBrief.briefing}</Text>
        </View>
      )}

      {/* Community Alerts — now from Supabase */}
      <Text style={s.sectionLabel}>COMMUNITY ALERTS NEARBY</Text>
      {communityAlerts.length === 0 ? (
        <View style={s.alertCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={SUBTEXT} />
          <Text style={[s.alertText, { color: SUBTEXT }]}>No reports nearby — all clear!</Text>
        </View>
      ) : (
        communityAlerts.map((a, i) => {
          const cat = REPORT_CATEGORIES[a.category] || REPORT_CATEGORIES["Other"];
          return (
            <TouchableOpacity key={a.id || i} style={s.alertCard} activeOpacity={0.7}>
              <View style={[s.alertDot, { backgroundColor: cat.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.alertText}>{a.category}{a.note ? ` — ${a.note}` : ""}</Text>
                <Text style={s.alertTime}>{formatTimeAgo(a.created_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={MUTED} />
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BG },
  // Header — paddingTop uses safe area insets set dynamically in component
  header:             { paddingBottom: 20, paddingHorizontal: 20, backgroundColor: BG },
  headerInner:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting:           { fontSize: 11, color: SUBTEXT, fontWeight: "700", letterSpacing: 1.2 },
  headerTitle:        { fontSize: 24, fontWeight: "800", color: TEXT, marginTop: 2 },
  profileThumb:       { width: 42, height: 42, borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderColor: PRIMARY },
  thumbImg:           { width: "100%", height: "100%" },
  thumbInitials:      { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  thumbText:          { fontSize: 15, fontWeight: "800" },
  // SOS section
  sosSection:         { alignItems: "center", justifyContent: "center", paddingVertical: 20, position: "relative" },
  ring:               { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: DANGER },
  ring1:              { width: 200, height: 200 },
  ring2:              { width: 250, height: 250 },
  ring3:              { width: 300, height: 300 },
  // Fake call btn
  fakeCallBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 4, marginBottom: 20, backgroundColor: CARD, borderRadius: 50, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  fakeCallBtnText:    { color: SUBTEXT, fontSize: 13, fontWeight: "600" },
  // Advisor
  advisorCard:        { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER },
  advisorHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  advisorTitle:       { color: PINK, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  riskBadge:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskBadgeText:      { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  advisorText:        { color: TEXT, fontSize: 13, lineHeight: 20 },
  // Alerts
  sectionLabel:       { fontSize: 10, color: SUBTEXT, fontWeight: "700", letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 8 },
  alertCard:          { backgroundColor: CARD, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  alertDot:           { width: 8, height: 8, borderRadius: 4 },
  alertText:          { fontSize: 13, color: TEXT, fontWeight: "500" },
  alertTime:          { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  // SOS active screen
  sosBg:              { flex: 1, backgroundColor: "#1a0505", alignItems: "center", justifyContent: "center", padding: 24 },
  sosGlow:            { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(220,38,38,0.15)", top: "25%" },
  sosActiveTitle:     { color: "#fca5a5", fontSize: 26, fontWeight: "900", letterSpacing: 2, marginVertical: 20 },
  sosActiveCard:      { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 20, width: "100%", gap: 12 },
  sosItem:            { flexDirection: "row", alignItems: "center", gap: 10 },
  sosItemText:        { color: "white", fontSize: 14 },
  sosCoords:          { color: "#fca5a5", fontSize: 11, marginTop: 20 },
  cancelSosBtn:       { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 40, marginTop: 30, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  cancelSosBtnText:   { color: "white", fontWeight: "700" },
  // Auto-danger overlay
  dangerBg:           { flex: 1, backgroundColor: "rgba(13,11,23,0.97)", alignItems: "center", justifyContent: "center", padding: 24 },
  dangerCard:         { backgroundColor: CARD, borderRadius: 24, padding: 28, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  dangerEmoji:        { fontSize: 48, marginBottom: 12 },
  dangerTitle:        { fontSize: 22, fontWeight: "800", color: WARNING, marginBottom: 8 },
  dangerBody:         { fontSize: 14, color: TEXT, textAlign: "center", lineHeight: 22, marginBottom: 16 },
  dangerCountdown:    { fontSize: 32, fontWeight: "900", color: DANGER, marginBottom: 20 },
  dangerCancelBtn:    { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 30, marginBottom: 10, borderWidth: 1, borderColor: BORDER, width: "100%", alignItems: "center" },
  dangerCancelText:   { color: TEXT, fontWeight: "700" },
  dangerSOSBtn:       { backgroundColor: DANGER, borderRadius: 14, paddingVertical: 13, width: "100%", alignItems: "center" },
  dangerSOSText:      { color: "white", fontWeight: "700", fontSize: 14 },
});
