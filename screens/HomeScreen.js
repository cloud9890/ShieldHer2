// screens/HomeScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Alert, Vibration, ScrollView, Platform, Modal, Image,
  TextInput, Switch, ActivityIndicator
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import {
  sendSOSAlert, startEvidenceRecording, registerForPushNotifications,
  startShakeDetection, stopShakeDetection, startBackgroundGuardian,
  stopBackgroundGuardian, setGlobalShakeCallback
} from "../services/sos";

// Haptics is only available on native
const triggerHaptic = () => {
  if (Platform.OS === "web") return;
  try { require("expo-haptics").notificationAsync(require("expo-haptics").NotificationFeedbackType.Error); } catch {}
};

const EMERGENCY_CONTACTS = [
  { name: "Mom",         phone: process.env.EXPO_PUBLIC_TWILIO_VERIFIED_NUMBER || "+918310661631" },
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
const AVATAR_COLORS = ["#7c3aed","#0ea5e9","#ec4899","#f59e0b","#10b981"];

export default function HomeScreen() {
  const [sosActive, setSosActive]   = useState(false);
  const [fakeCall, setFakeCall]     = useState(false);
  const [guardianOn, setGuardianOn] = useState(true);
  const [location, setLocation]     = useState(null);
  const [shakeBadge, setShakeBadge] = useState(false);
  
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
    
    // Animations
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

  const avatarColor = AVATAR_COLORS[(profile.name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials = profile.name?.trim().split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "SH";

  // ── Render Helpers ────────────────────────────────────────

  if (fakeCall) return (
    <View style={s.fcBg}>
      <View style={s.fcTop}>
        <View style={s.fcAvatar}><Ionicons name="person-circle" size={72} color="#a78bfa" /></View>
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

  if (sosActive) return (
    <View style={s.sosBg}>
      <Animated.View style={[s.sosGlow, { opacity: glowAnim }]} />
      <Ionicons name="alert-circle" size={72} color="#ef4444" />
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
      {location && <Text style={s.sosCoords}><Ionicons name="location" size={12} color="#a78bfa" /> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
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
            <Text style={s.headerTitle}>Stay Safe <Ionicons name="heart" size={18} color="#ec4899" /></Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.notifBtn}><Ionicons name="notifications" size={18} color={PRIMARY} /></View>
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

      {/* Guardian Mode */}
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

      {/* SOS Button Area */}
      <View style={s.sosSection}>
        <View style={s.sosRingOuter}>
          <Animated.View style={[s.sosRingMid, { opacity: glowAnim }]} />
          <View style={s.sosRing}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: pressProgress.interpolate({ inputRange: [0, 1], outputRange: ["rgba(239,68,68,0)", "rgba(239,68,68,0.35)"] }), borderRadius: 999 }]} />
            <TouchableOpacity style={s.sosBtn} onPressIn={startPress} onPressOut={cancelPress} activeOpacity={0.9}>
              <Text style={s.sosBtnLabel}>SOS</Text>
              <Text style={s.sosBtnSub}>Hold 3s</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.sosProgressTrack}>
          <Animated.View style={[s.sosProgressFill, { width: pressProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
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

      {/* ── Profile Modal ────────────────────────────────────── */}
      <Modal visible={showProfile} animationType="slide" transparent={false}>
        <View style={s.modBg}>
          <View style={s.modHeader}>
            <TouchableOpacity onPress={() => setShowProfile(false)}><Ionicons name="chevron-down" size={28} color={PRIMARY} /></TouchableOpacity>
            <Text style={s.modTitle}>Account Settings</Text>
            <TouchableOpacity style={s.modEdit} onPress={() => { if(!editing) setDraft(profile); setEditing(!editing); }}>
              <Text style={s.modEditText}>{editing ? "Cancel" : "Edit"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <View style={s.modAvatarSection}>
              <TouchableOpacity style={s.modAvatar} onPress={pickImage}>
                {imageUri ? <Image source={{ uri: imageUri }} style={s.modImg} /> : <View style={[s.modInitials, { backgroundColor: avatarColor + "22" }]}><Text style={[s.modInitText, { color: avatarColor }]}>{initials}</Text></View>}
                <View style={s.modCam}><Ionicons name="camera" size={12} color="white" /></View>
              </TouchableOpacity>
              {uploading && <ActivityIndicator color={PRIMARY} style={{ marginTop: 10 }} />}
            </View>

            {editing ? (
              <View style={s.modForm}>
                <View style={s.modInputRow}><Ionicons name="person-outline" size={16} color={SUBTEXT} /><TextInput style={s.modInput} value={draft.name} onChangeText={v => setDraft(d=>({...d, name:v}))} placeholder="Name" placeholderTextColor="#4b5563" /></View>
                <View style={s.modInputRow}><Ionicons name="call-outline" size={16} color={SUBTEXT} /><TextInput style={s.modInput} value={draft.phone} onChangeText={v => setDraft(d=>({...d, phone:v}))} placeholder="Phone" placeholderTextColor="#4b5563" keyboardType="phone-pad" /></View>
                <TouchableOpacity style={s.modSave} onPress={saveProfile}><Text style={s.modSaveText}>Update Profile</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={s.modInfo}>
                <Text style={s.modNameText}>{profile.name}</Text>
                <Text style={s.modPhoneText}>{profile.phone || "No phone added"}</Text>
              </View>
            )}

            <View style={s.modSection}>
              <Text style={s.modSectionLabel}>Settings</Text>
              <View style={s.modCard}>
                <View style={s.modRow}><Ionicons name="phone-portrait-outline" size={18} color={PINK} /><Text style={s.modRowLabel}>Shake to SOS</Text><Switch value={true} trackColor={{ true: PRIMARY+"80" }} thumbColor={PRIMARY} /></View>
                <View style={s.modRow}><Ionicons name="notifications-outline" size={18} color="#f59e0b" /><Text style={s.modRowLabel}>Alerts</Text><Switch value={true} trackColor={{ true: PRIMARY+"80" }} thumbColor={PRIMARY} /></View>
                <TouchableOpacity style={[s.modRow, { borderBottomWidth: 0 }]} onPress={() => supabase.auth.signOut()}><Ionicons name="log-out-outline" size={18} color="#ef4444" /><Text style={[s.modRowLabel, { color: "#ef4444" }]}>Sign Out</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BG },
  header:           { backgroundColor: "#12082a", paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
  headerInner:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight:      { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting:         { color: "#7c3aed", fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  headerTitle:      { color: TEXT, fontSize: 26, fontWeight: "800", marginTop: 2 },
  notifBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(139,92,246,0.1)", borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  profileThumb:     { width: 38, height: 38, borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: PRIMARY },
  thumbImg:         { width: "100%", height: "100%" },
  thumbInitials:    { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  thumbText:        { fontSize: 14, fontWeight: "800" },

  guardianCard:     { marginHorizontal: 16, marginTop: 16, backgroundColor: CARD, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BORDER },
  guardianLeft:     { flexDirection: "row", alignItems: "center", gap: 12 },
  guardianDot:      { width: 10, height: 10, borderRadius: 5 },
  guardianLabel:    { color: TEXT, fontSize: 14, fontWeight: "700" },
  guardianStatus:   { fontSize: 11, marginTop: 1 },
  guardianToggle:   { width: 40, height: 22, borderRadius: 11, padding: 2, justifyContent: "center" },
  guardianThumb:    { width: 18, height: 18, borderRadius: 9, backgroundColor: "white" },

  sosSection:       { alignItems: "center", paddingVertical: 32 },
  sosRingOuter:     { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  sosRingMid:       { position: "absolute", width: 196, height: 196, borderRadius: 98, backgroundColor: "rgba(239,68,68,0.06)", borderWidth: 2, borderColor: "rgba(239,68,68,0.2)" },
  sosRing:          { width: 164, height: 164, borderRadius: 82, borderWidth: 3, borderColor: "rgba(239,68,68,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sosBtn:           { width: 148, height: 148, borderRadius: 74, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  sosBtnLabel:      { color: "white", fontSize: 32, fontWeight: "900" },
  sosBtnSub:        { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
  sosProgressTrack: { width: 220, height: 4, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 2, marginTop: 14 },
  sosProgressFill:  { height: 4, backgroundColor: "#ef4444", borderRadius: 2 },
  sosHint:          { fontSize: 12, color: SUBTEXT, textAlign: "center", marginTop: 10 },
  fakeCallBtn:      { marginTop: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(139,92,246,0.05)" },
  fakeCallBtnText:  { color: PRIMARY, fontSize: 13, fontWeight: "600" },

  sectionLabel:     { fontSize: 10, color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10 },
  alertCard:        { backgroundColor: CARD, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  alertDot:         { width: 8, height: 8, borderRadius: 4 },
  alertText:        { fontSize: 13, color: TEXT },
  alertTime:        { fontSize: 11, color: SUBTEXT, marginTop: 2 },

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
  fcAvatar:  { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1a2332", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: PRIMARY },
  fcName:    { color: TEXT, fontSize: 28, fontWeight: "700" },
  fcSub:     { color: "#34d399", fontSize: 14 },
  fcBtns:    { flexDirection: "row", gap: 60 },
  fcBtn:     { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },

  // Modal Profile
  modBg:          { flex: 1, backgroundColor: BG },
  modHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BORDER },
  modTitle:       { color: TEXT, fontSize: 18, fontWeight: "800" },
  modEdit:        { padding: 5 },
  modEditText:    { color: PRIMARY, fontWeight: "600" },
  modAvatarSection: { alignItems: "center", marginVertical: 30 },
  modAvatar:      { width: 110, height: 110, borderRadius: 30, overflow: "hidden", borderWidth: 2, borderColor: BORDER },
  modImg:         { width: "100%", height: "100%" },
  modInitials:    { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  modInitText:    { fontSize: 36, fontWeight: "900" },
  modCam:         { position: "absolute", bottom: 0, right: 0, backgroundColor: PRIMARY, width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: BG },
  modInfo:        { alignItems: "center", gap: 6, marginBottom: 30 },
  modNameText:    { fontSize: 26, fontWeight: "900", color: TEXT },
  modPhoneText:   { fontSize: 15, color: SUBTEXT },
  modForm:        { gap: 12, marginBottom: 30 },
  modInputRow:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  modInput:       { flex: 1, color: TEXT, fontSize: 15 },
  modSave:        { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 10 },
  modSaveText:    { color: "white", fontWeight: "800", fontSize: 16 },
  modSection:     { gap: 10 },
  modSectionLabel: { color: SUBTEXT, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginLeft: 4 },
  modCard:        { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  modRow:         { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
  modRowLabel:    { flex: 1, color: TEXT, fontSize: 15, fontWeight: "600" },
});

