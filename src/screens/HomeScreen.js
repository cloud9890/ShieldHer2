// src/screens/HomeScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Alert, Vibration, ScrollView, Platform, Image
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

// API & Theme
import { supabase } from "../api/supabase";
import { COLORS } from "../theme/colors";
import {
  sendSOSAlert, startEvidenceRecording, registerForPushNotifications,
  startShakeDetection, stopShakeDetection, startBackgroundGuardian,
  stopBackgroundGuardian, setGlobalShakeCallback
} from "../api/sos";

// Components
import SOSButton from "../components/home/SOSButton";
import ProfileModal from "../components/home/ProfileModal";
import GuardianBadge from "../components/home/GuardianBadge";

const EMERGENCY_CONTACTS = [
  { name: "Mom",         phone: process.env.EXPO_PUBLIC_TWILIO_VERIFIED_NUMBER || "+918310661631" },
  { name: "Sister Riya", phone: "+91-91234-56789" },
];

const COMMUNITY_ALERTS = [
  { text: "Poorly lit street on MG Road",           time: "12 min ago", level: "orange" },
  { text: "Suspicious activity near Sector 14 park", time: "1 hr ago",  level: "red"    },
];

const AVATAR_COLORS = ["#7c3aed","#0ea5e9","#ec4899","#f59e0b","#10b981"];

export default function HomeScreen() {
  const [sosActive, setSosActive]   = useState(false);
  const [fakeCall, setFakeCall]     = useState(false);
  const [guardianOn, setGuardianOn] = useState(true);
  const [location, setLocation]     = useState(null);
  
  // Profile State
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState({ name: "User", phone: "" });
  const [imageUri, setImageUri] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [uploading, setUploading] = useState(false);

  const pressProgress = useRef(new Animated.Value(0)).current;
  const pressAnim     = useRef(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const glowAnim      = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    loadProfile();
    registerForPushNotifications().catch(() => {});
    
    // Global Animations
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

  // Shake detection sync
  useEffect(() => {
    const onShake = () => { Vibration.vibrate(200); activateSOS(); };
    if (guardianOn) {
      setGlobalShakeCallback(onShake);
      startShakeDetection(onShake);
      startBackgroundGuardian(onShake);
    } else {
      stopShakeDetection();
      stopBackgroundGuardian();
    }
  }, [guardianOn]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile({ name: data.name || "User", phone: data.phone || "" });
      if (data.avatar_url) setImageUri(data.avatar_url);
    }
  };

  const saveProfile = async () => {
    if (!draft.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const u = { name: draft.name.trim(), phone: draft.phone.trim() };
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...u, updated_at: new Date() });
    if (!error) { setProfile(u); setEditing(false); }
    else { Alert.alert("Error", error.message); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.length) return;
    
    setUploading(true);
    try {
      const asset = result.assets[0];
      const { data: { user } } = await supabase.auth.getUser();
      const ext = asset.uri.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const res = await fetch(asset.uri);
      const buffer = await res.arrayBuffer();
      
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, buffer, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").upsert({ id: user.id, avatar_url: pubData.publicUrl });
      setImageUri(pubData.publicUrl + "?t=" + Date.now());
    } catch (err) {
      Alert.alert("Upload Failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const activateSOS = async () => {
    Vibration.vibrate([0, 200, 100, 200]);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    }
    setSosActive(true);
    sendSOSAlert(EMERGENCY_CONTACTS, "sos").catch(e => console.error("SOS:", e));
    startEvidenceRecording().catch(() => {});
  };

  const avatarColor = AVATAR_COLORS[(profile.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials = profile.name?.trim().split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "SH";

  // ── Render Helpers ────────────────────────────────────────

  if (fakeCall) return (
    <View style={s.fcBg}>
      <View style={s.fcTop}>
        <View style={s.fcAvatar}><Ionicons name="person-circle" size={72} color={COLORS.PRIMARY} /></View>
        <Text style={s.fcName}>Mom</Text>
        <Text style={s.fcSub}>Incoming Call…</Text>
      </View>
      <View style={s.fcBtns}>
        <TouchableOpacity style={[s.fcBtn, { backgroundColor: COLORS.DANGER }]} onPress={() => setFakeCall(false)}>
          <Ionicons name="call" size={28} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.fcBtn, { backgroundColor: COLORS.SUCCESS }]} onPress={() => setFakeCall(false)}>
          <Ionicons name="call" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (sosActive) return (
    <View style={s.sosBg}>
      <Animated.View style={[s.sosGlow, { opacity: glowAnim }]} />
      <Ionicons name="alert-circle" size={72} color={COLORS.DANGER} />
      <Text style={s.sosActiveTitle}>SOS ACTIVATED</Text>
      <View style={s.sosActiveCard}>
        {["Live location sent to contacts", "SMS alert dispatched", "Recording started", "Nearest police notified"]
          .map((t, i) => (
            <View key={i} style={s.sosItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
              <Text style={s.sosItemText}>{t}</Text>
            </View>
          ))}
      </View>
      {location && <Text style={s.sosCoords}><Ionicons name="location" size={12} color={COLORS.ACCENT} /> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
      <TouchableOpacity style={s.cancelSosBtn} onPress={() => { setSosActive(false); pressProgress.setValue(0); }}>
        <Text style={s.cancelSosBtnText}>I'm Safe — Cancel SOS</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <View>
            <Text style={s.greeting}>Good evening, {profile.name.split(" ")[0]}</Text>
            <Text style={s.headerTitle}>Stay Safe <Ionicons name="heart" size={18} color={COLORS.PINK} /></Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.notifBtn}><Ionicons name="notifications" size={18} color={COLORS.PRIMARY} /></View>
            <TouchableOpacity style={s.profileThumb} onPress={() => setShowProfile(true)}>
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
      </View>

      <GuardianBadge 
        guardianOn={guardianOn} 
        onPress={() => setGuardianOn(!guardianOn)} 
        pulseAnim={pulseAnim} 
      />

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

      {/* Alerts */}
      <Text style={s.sectionLabel}>Community Alerts Nearby</Text>
      {COMMUNITY_ALERTS.map((a, i) => (
        <View key={i} style={s.alertCard}>
          <View style={[s.alertDot, { backgroundColor: a.level === "red" ? COLORS.DANGER : COLORS.WARNING }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertText}>{a.text}</Text>
            <Text style={s.alertTime}>{a.time}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={COLORS.MUTED} />
        </View>
      ))}

      <ProfileModal 
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        editing={editing}
        setEditing={setEditing}
        draft={draft}
        setDraft={setDraft}
        saveProfile={saveProfile}
        imageUri={imageUri}
        pickImage={pickImage}
        uploading={uploading}
        onSignOut={() => supabase.auth.signOut()}
        avatarColor={avatarColor}
        initials={initials}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.BG },
  header:           { backgroundColor: COLORS.HEADER, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerInner:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight:      { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting:         { color: COLORS.PRIMARY, fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  headerTitle:      { color: COLORS.TEXT, fontSize: 26, fontWeight: "800", marginTop: 2 },
  notifBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(139,92,246,0.1)", borderWidth: 1, borderColor: COLORS.BORDER, alignItems: "center", justifyContent: "center" },
  profileThumb:     { width: 38, height: 38, borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: COLORS.PRIMARY },
  thumbImg:         { width: "100%", height: "100%" },
  thumbInitials:    { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  thumbText:        { fontSize: 14, fontWeight: "800" },

  sectionLabel:     { fontSize: 10, color: COLORS.MUTED, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10, marginTop: 10 },
  alertCard:        { backgroundColor: COLORS.CARD, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.BORDER },
  alertDot:         { width: 8, height: 8, borderRadius: 4 },
  alertText:        { fontSize: 13, color: COLORS.TEXT },
  alertTime:        { fontSize: 11, color: COLORS.SUBTEXT, marginTop: 2 },

  sosBg:            { flex: 1, backgroundColor: "#1a0505", alignItems: "center", justifyContent: "center", padding: 24 },
  sosGlow:          { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(220,38,38,0.15)", top: "25%" },
  sosActiveTitle:   { color: "#fca5a5", fontSize: 26, fontWeight: "900", letterSpacing: 2, marginVertical: 20 },
  sosActiveCard:    { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 20, width: "100%", gap: 12 },
  sosItem:          { flexDirection: "row", alignItems: "center", gap: 10 },
  sosItemText:      { color: "white", fontSize: 14 },
  sosCoords:        { color: "#fca5a5", fontSize: 11, marginTop: 20 },
  cancelSosBtn:     { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 40, marginTop: 30, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  cancelSosBtnText: { color: "white", fontWeight: "700" },

  fcBg:      { flex: 1, backgroundColor: "#080c10", alignItems: "center", justifyContent: "space-between", paddingVertical: 80 },
  fcTop:     { alignItems: "center", gap: 12 },
  fcAvatar:  { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1a2332", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.PRIMARY },
  fcName:    { color: COLORS.TEXT, fontSize: 28, fontWeight: "700" },
  fcSub:     { color: "#34d399", fontSize: 14 },
  fcBtns:    { flexDirection: "row", gap: 60 },
  fcBtn:     { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
});
, padding: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
  modRowLabel:    { flex: 1, color: TEXT, fontSize: 15, fontWeight: "600" },
});

