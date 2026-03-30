// screens/ProfileScreen.js
import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Alert, Linking, Image, Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";
const VERSION = "1.0.0";
const AVATAR_COLORS = ["#7c3aed","#0ea5e9","#ec4899","#f59e0b","#10b981"];

export default function ProfileScreen() {
  const [profile,  setProfile]  = useState({ name: "Your Name", phone: "+91-" });
  const [imageUri, setImageUri] = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState({ name: "", phone: "" });
  const [shakeOn,  setShakeOn]  = useState(true);
  const [notifOn,  setNotifOn]  = useState(true);
  const [guardOn,  setGuardOn]  = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("shieldher_profile").then(d => { if (d) setProfile(JSON.parse(d)); });
    AsyncStorage.getItem("shieldher_profile_pic").then(uri => { if (uri) setImageUri(uri); });
    AsyncStorage.getItem("shieldher_settings").then(d => {
      if (d) {
        const s = JSON.parse(d);
        setShakeOn(s.shakeOn ?? true);
        setNotifOn(s.notifOn ?? true);
        setGuardOn(s.guardOn ?? true);
      }
    });
  }, []);

  // ── Profile save ─────────────────────────────────────────────────────────
  const save = async () => {
    if (!draft.name.trim()) { Alert.alert("Name cannot be empty."); return; }
    const u = { name: draft.name.trim(), phone: draft.phone.trim() };
    setProfile(u);
    await AsyncStorage.setItem("shieldher_profile", JSON.stringify(u));
    setEditing(false);
  };

  const saveSetting = async (key, val) => {
    const s = { shakeOn, notifOn, guardOn, [key]: val };
    await AsyncStorage.setItem("shieldher_settings", JSON.stringify(s));
  };

  // ── Photo upload ─────────────────────────────────────────────────────────
  const pickImage = () => {
    Alert.alert("Profile Photo", "Choose source", [
      { text: "📷 Camera",  onPress: launchCamera  },
      { text: "🖼️ Gallery", onPress: launchGallery },
      { text: "🗑️ Remove",  onPress: removePhoto,  style: "destructive" },
      { text: "Cancel",                             style: "cancel"      },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.75,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) savePhoto(result.assets[0].uri);
  };

  const launchGallery = async () => {
    let status;
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = perm.status;
      if (status !== "granted") {
        Alert.alert("Permission needed", "Gallery permission is required.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality:       0.75,
      allowsEditing: true,
      aspect:        [1, 1],
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) savePhoto(result.assets[0].uri);
  };

  const savePhoto = async (uri) => {
    setImageUri(uri);
    await AsyncStorage.setItem("shieldher_profile_pic", uri);
  };

  const removePhoto = async () => {
    setImageUri(null);
    await AsyncStorage.removeItem("shieldher_profile_pic");
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const avatarColor = AVATAR_COLORS[(profile.name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials    = profile.name.trim().split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "SH";

  // ── Reusable Row ─────────────────────────────────────────────────────────
  const Row = ({ icon, color = PRIMARY, label, sub, right, onPress, last }) => (
    <TouchableOpacity
      style={[s.row, !last && s.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[s.rowIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={14} color="#4b5563" /> : null)}
    </TouchableOpacity>
  );

  const Card = ({ title, children, redBorder }) => (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={[s.sectionCard, redBorder && { borderColor: "rgba(239,68,68,0.25)" }]}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerLabel}>MY PROFILE</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => {
            if (!editing) setDraft({ name: profile.name, phone: profile.phone });
            setEditing(e => !e);
          }}
        >
          <Ionicons name={editing ? "close" : "pencil"} size={15} color={PRIMARY} />
          <Text style={s.editBtnText}>{editing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Card */}
      <View style={s.avatarCard}>
        {/* Tappable avatar — opens photo picker */}
        <TouchableOpacity style={s.avatarWrapper} onPress={pickImage} activeOpacity={0.85}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.avatarImage} />
          ) : (
            <View style={[s.avatarInitials, { backgroundColor: avatarColor + "22", borderColor: avatarColor + "50" }]}>
              <Text style={[s.avatarText, { color: avatarColor }]}>{initials}</Text>
            </View>
          )}
          {/* Camera overlay badge */}
          <View style={s.cameraOverlay}>
            <Ionicons name="camera" size={14} color="white" />
          </View>
        </TouchableOpacity>

        {/* Edit form or Profile info */}
        {editing ? (
          <View style={s.editForm}>
            {[
              { key: "name",  icon: "person-outline", placeholder: "Full name",      kb: "default"   },
              { key: "phone", icon: "call-outline",   placeholder: "+91-XXXXXXXXXX", kb: "phone-pad" },
            ].map(f => (
              <View key={f.key} style={s.inputRow}>
                <Ionicons name={f.icon} size={15} color={SUBTEXT} />
                <TextInput
                  style={s.input}
                  value={draft[f.key]}
                  onChangeText={v => setDraft(d => ({ ...d, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#4b5563"
                  keyboardType={f.kb}
                />
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={save}>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={s.saveBtnText}>Save Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{profile.name}</Text>
            <Text style={s.profilePhone}>{profile.phone || "Add phone number"}</Text>
            <View style={s.badge}>
              <Ionicons name="shield-checkmark" size={12} color="#34d399" />
              <Text style={s.badgeText}>ShieldHer Protected</Text>
            </View>
            <Text style={s.photoHint}>Tap photo to change</Text>
          </View>
        )}
      </View>

      {/* Safety Settings */}
      <Card title="SAFETY SETTINGS">
        <Row
          icon="phone-portrait-outline" color="#ec4899"
          label="Shake to SOS" sub="Shake device 5x to trigger emergency alert"
          right={
            <Switch value={shakeOn} onValueChange={v => { setShakeOn(v); saveSetting("shakeOn", v); }}
              trackColor={{ false: "#374151", true: PRIMARY + "80" }} thumbColor={shakeOn ? PRIMARY : "#6b7280"} />
          }
        />
        <Row
          icon="notifications-outline" color="#f59e0b"
          label="Push Notifications" sub="SOS confirmations and safety alerts"
          right={
            <Switch value={notifOn} onValueChange={v => { setNotifOn(v); saveSetting("notifOn", v); }}
              trackColor={{ false: "#374151", true: PRIMARY + "80" }} thumbColor={notifOn ? PRIMARY : "#6b7280"} />
          }
        />
        <Row
          icon="eye-outline" color="#34d399"
          label="Guardian Mode" sub="Active monitoring while app is open" last
          right={
            <Switch value={guardOn} onValueChange={v => { setGuardOn(v); saveSetting("guardOn", v); }}
              trackColor={{ false: "#374151", true: "#34d399" + "80" }} thumbColor={guardOn ? "#34d399" : "#6b7280"} />
          }
        />
      </Card>

      {/* Emergency Quick Dial */}
      <Card title="EMERGENCY QUICK DIAL">
        <Row icon="call"    color="#ef4444" label="Police"            sub="Dial 100"        onPress={() => Linking.openURL("tel:100")} />
        <Row icon="medical" color="#ec4899" label="Women Helpline"    sub="Dial 181 — 24×7" onPress={() => Linking.openURL("tel:181")} />
        <Row icon="shield"  color="#8b5cf6" label="National Emergency" sub="Dial 112"       last onPress={() => Linking.openURL("tel:112")} />
      </Card>

      {/* About */}
      <Card title="ABOUT">
        <Row icon="information-circle-outline" label={"App Version v" + VERSION} sub="ShieldHer Safety Platform" />
        <Row icon="logo-github" color="#e5e7eb" label="GitHub Repository" sub="cloud9890/ShieldHer2"
          onPress={() => Linking.openURL("https://github.com/cloud9890/ShieldHer2")} />
        <Row icon="shield-outline" color="#34d399" label="Privacy Policy"
          onPress={() => Alert.alert("Privacy", "All evidence is stored locally on your device. Location is shared only with your chosen contacts via encrypted SMS. No data is sent to third-party servers except Twilio for SMS alerts.")} />
        <Row icon="heart-outline" color="#ec4899" label="Made with 💜 for women's safety" last />
      </Card>

      {/* Danger Zone */}
      <Card title="DANGER ZONE" redBorder>
        <Row
          icon="trash-outline" color="#ef4444"
          label="Clear All Data" sub="Delete all incidents, contacts & profile" last
          onPress={() => Alert.alert("Clear All Data?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear Everything", style: "destructive", onPress: async () => {
              await AsyncStorage.multiRemove([
                "shieldher_profile", "shieldher_profile_pic", "shieldher_settings",
                "shieldher_contacts", "shieldher_incidents",
              ]);
              setImageUri(null);
              setProfile({ name: "Your Name", phone: "+91-" });
              Alert.alert("Done", "All local data has been erased.");
            }},
          ])}
        />
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BG },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  headerLabel:    { fontSize: 11, color: "#4b5563", fontWeight: "700", letterSpacing: 1.2 },
  editBtn:        { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(139,92,246,0.07)" },
  editBtnText:    { color: PRIMARY, fontSize: 12, fontWeight: "600" },

  // Avatar card
  avatarCard:     { backgroundColor: CARD, borderRadius: 24, marginHorizontal: 16, marginBottom: 8, padding: 20, alignItems: "center", borderWidth: 1, borderColor: BORDER, gap: 14 },
  avatarWrapper:  { position: "relative" },
  avatarInitials: { width: 88, height: 88, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarImage:    { width: 88, height: 88, borderRadius: 24, borderWidth: 2, borderColor: "rgba(139,92,246,0.4)" },
  avatarText:     { fontSize: 30, fontWeight: "800" },
  cameraOverlay:  { position: "absolute", bottom: -5, right: -5, width: 28, height: 28, borderRadius: 10, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: CARD },
  profileInfo:    { alignItems: "center", gap: 4 },
  profileName:    { fontSize: 22, fontWeight: "800", color: TEXT },
  profilePhone:   { fontSize: 14, color: SUBTEXT },
  badge:          { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(52,211,153,0.1)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  badgeText:      { fontSize: 11, color: "#34d399", fontWeight: "600" },
  photoHint:      { fontSize: 10, color: "#374151", marginTop: 6 },

  // Edit form
  editForm:       { width: "100%", gap: 10 },
  inputRow:       { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "rgba(255,255,255,0.03)" },
  input:          { flex: 1, fontSize: 14, color: TEXT },
  saveBtn:        { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13 },
  saveBtnText:    { color: "white", fontWeight: "700", fontSize: 14 },

  // Sections
  section:        { marginHorizontal: 16, marginBottom: 14 },
  sectionLabel:   { fontSize: 10, color: "#4b5563", fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  sectionCard:    { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },

  // Rows
  row:            { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowBorder:      { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent:     { flex: 1 },
  rowLabel:       { fontSize: 14, fontWeight: "600", color: TEXT },
  rowSub:         { fontSize: 11, color: SUBTEXT, marginTop: 1 },
});
