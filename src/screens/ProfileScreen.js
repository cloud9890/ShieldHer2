// screens/ProfileScreen.js
import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Switch, Alert, Linking, Image, Platform, ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../api/supabase";
import { BG_DEEP as BG, CARD_DEEP as CARD, BORDER_VIOLET as BORDER, PRIMARY, TEXT, SUBTEXT } from "../theme/colors";
import useToast from "../hooks/useToast";

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
  const [biometricOn, setBiometricOn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no row (new user)
      if (data) {
        setProfile({ name: data.name || "Your Name", phone: data.phone || "+91-" });
        setShakeOn(data.shake_on ?? true);
        setNotifOn(data.notif_on ?? true);
        setGuardOn(data.guard_on ?? true);
        setBiometricOn(data.biometric_on ?? false);
        if (data.avatar_url) setImageUri(data.avatar_url);
      }
    } catch (e) {
      console.error("loadProfile:", e.message);
      showToast("Could not load profile. Pull down to retry.", "error");
    }
  };

  // ── Profile save ─────────────────────────────────────────────────────────
  const save = async () => {
    if (!draft.name.trim()) { showToast("Name cannot be empty.", "warning"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      const u = { name: draft.name.trim(), phone: draft.phone.trim() };
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...u, updated_at: new Date() });
      if (error) throw error;
      setProfile(u);
      setEditing(false);
      showToast("Profile saved to cloud ✓", "success");
    } catch (e) {
      showToast(e.message || "Could not save profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveSetting = async (key, val) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, [key]: val, updated_at: new Date() });
      if (error) throw error;
    } catch (e) {
      // Toggle failure: revert the switch state by reloading settings
      console.error("saveSetting:", e.message);
      showToast("Setting could not be saved. Check your connection.", "warning");
      loadProfile(); // revert UI to persisted state
    }
  };

  // ── Photo upload (Supabase Storage) ──────────────────────────────────────
  const pickImage = () => {
    if (Platform.OS === "web") {
      // On web, Alert doesn't work — go straight to gallery
      launchGallery();
      return;
    }
    Alert.alert("Profile Photo", "Choose source", [
      { text: "Camera",       onPress: launchCamera  },
      { text: "Gallery",      onPress: launchGallery },
      { text: "Remove Photo", onPress: removePhoto, style: "destructive" },
      { text: "Cancel",       style: "cancel" },
    ]);
  };

  const processImageResult = async (result) => {
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Determine extension & MIME type
      const uriParts = asset.uri.split(".");
      const ext  = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      const filePath = `${user.id}/avatar.${ext}`;

      // Fetch the image as an arraybuffer (works on both web and native)
      const res   = await fetch(asset.uri);
      const buffer = await res.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, buffer, { contentType: mime, upsert: true });

      if (uploadError) throw uploadError;

      // Add cache-buster so the Image component re-fetches
      const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = pubData.publicUrl + "?t=" + Date.now();

      await supabase.from("profiles").upsert({ id: user.id, avatar_url: pubData.publicUrl });
      setImageUri(publicUrl);
      Alert.alert("Success", "Profile photo updated!");
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload Failed", err.message || "Could not upload photo. Make sure the 'avatars' bucket exists in Supabase Storage.");
    }
    setUploading(false);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true, aspect: [1, 1] });
    processImageResult(result);
  };

  const launchGallery = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed"); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsEditing: true, aspect: [1, 1] });
    processImageResult(result);
  };

  const removePhoto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: null });
      if (error) throw error;
      setImageUri(null);
      showToast("Profile photo removed.", "info");
    } catch (e) {
      showToast(e.message || "Could not remove photo.", "error");
    }
  };

  const signOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          try {
            await supabase.auth.signOut();
          } catch (e) {
            showToast("Sign out failed. Try again.", "error");
          }
        },
      },
    ]);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const avatarColor = AVATAR_COLORS[(profile.name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials    = profile.name.trim().split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "SH";

  const Row = ({ icon, color = PRIMARY, label, sub, right, onPress, last }) => (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
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
      <View style={[s.sectionCard, redBorder && { borderColor: "rgba(239,68,68,0.25)" }]}>{children}</View>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.headerLabel}>MY PROFILE (CLOUD)</Text>
        <TouchableOpacity style={s.editBtn} onPress={() => {
            if (!editing) setDraft({ name: profile.name, phone: profile.phone });
            setEditing(!editing);
          }}>
          <Ionicons name={editing ? "close" : "pencil"} size={15} color={PRIMARY} />
          <Text style={s.editBtnText}>{editing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.avatarCard}>
        <TouchableOpacity style={s.avatarWrapper} onPress={pickImage} activeOpacity={0.85} disabled={uploading}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.avatarImage} />
          ) : (
            <View style={[s.avatarInitials, { backgroundColor: avatarColor + "22", borderColor: avatarColor + "50" }]}>
              <Text style={[s.avatarText, { color: avatarColor }]}>{initials}</Text>
            </View>
          )}
          <View style={s.cameraOverlay}>
            {uploading ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="cloud-upload" size={14} color="white" />}
          </View>
        </TouchableOpacity>

        {editing ? (
          <View style={s.editForm}>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={15} color={SUBTEXT} />
              <TextInput style={s.input} value={draft.name} onChangeText={v => setDraft(d => ({ ...d, name: v }))} placeholder="Full name" placeholderTextColor="#4b5563" />
            </View>
            <View style={s.inputRow}>
              <Ionicons name="call-outline" size={15} color={SUBTEXT} />
              <TextInput style={s.input} value={draft.phone} onChangeText={v => setDraft(d => ({ ...d, phone: v }))} placeholder="+91-XXXXXXXXXX" placeholderTextColor="#4b5563" keyboardType="phone-pad" />
            </View>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="white" size="small" />
                : <><Ionicons name="cloud-done" size={16} color="white" /><Text style={s.saveBtnText}>Save to Cloud</Text></>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{profile.name}</Text>
            <Text style={s.profilePhone}>{profile.phone}</Text>
            <View style={s.badge}>
              <Ionicons name="cloud-done" size={12} color="#34d399" />
              <Text style={s.badgeText}>Supabase Synced</Text>
            </View>
          </View>
        )}
      </View>

      <Card title="SAFETY SETTINGS">
        <Row icon="phone-portrait-outline" color="#ec4899" label="Shake to SOS" right={
            <Switch value={shakeOn} onValueChange={v => { setShakeOn(v); saveSetting("shake_on", v); }} trackColor={{ true: PRIMARY + "80" }} thumbColor={shakeOn ? PRIMARY : "#6b7280"} />
          } />
        <Row icon="notifications-outline" color="#f59e0b" label="Push Notifications" right={
            <Switch value={notifOn} onValueChange={v => { setNotifOn(v); saveSetting("notif_on", v); }} trackColor={{ true: PRIMARY + "80" }} thumbColor={notifOn ? PRIMARY : "#6b7280"} />
          } />
        <Row icon="eye-outline" color="#34d399" label="Guardian Mode" right={
            <Switch value={guardOn} onValueChange={v => { setGuardOn(v); saveSetting("guard_on", v); }} trackColor={{ true: "#34d39980" }} thumbColor={guardOn ? "#34d399" : "#6b7280"} />
          } />
        <Row icon="finger-print" color="#8b5cf6" label="Biometric Vault Lock" sub="Require fingerprint to open Vault" last right={
            <Switch value={biometricOn} onValueChange={v => { setBiometricOn(v); saveSetting("biometric_on", v); }} trackColor={{ true: PRIMARY + "80" }} thumbColor={biometricOn ? PRIMARY : "#6b7280"} />
          } />
      </Card>

      <Card title="ACCOUNT">
        <Row icon="log-out-outline" color="#ef4444" label="Sign Out" sub="Disconnect from cloud" last onPress={signOut} />
      </Card>

      <View style={{ height: 40 }} />
      <ToastComponent />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BG },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8 },
  headerLabel:    { fontSize: 11, color: "#a78bfa", fontWeight: "700", letterSpacing: 1.2 },
  editBtn:        { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(139,92,246,0.07)" },
  editBtnText:    { color: PRIMARY, fontSize: 12, fontWeight: "600" },

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

  editForm:       { width: "100%", gap: 10 },
  inputRow:       { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "rgba(255,255,255,0.03)" },
  input:          { flex: 1, fontSize: 14, color: TEXT },
  saveBtn:        { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13 },
  saveBtnText:    { color: "white", fontWeight: "700", fontSize: 14 },

  section:        { marginHorizontal: 16, marginBottom: 14 },
  sectionLabel:   { fontSize: 10, color: "#4b5563", fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  sectionCard:    { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  row:            { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowBorder:      { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  rowIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent:     { flex: 1 },
  rowLabel:       { fontSize: 14, fontWeight: "600", color: TEXT },
  rowSub:         { fontSize: 11, color: SUBTEXT, marginTop: 1 },
});
