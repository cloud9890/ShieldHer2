// src/components/home/ProfileModal.js
import React from "react";
import { 
  View, Text, TouchableOpacity, ScrollView, Modal, TextInput, 
  Switch, ActivityIndicator, Image, StyleSheet 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

export default function ProfileModal({ 
  visible, 
  onClose, 
  profile, 
  editing, 
  setEditing, 
  draft, 
  setDraft, 
  saveProfile, 
  imageUri, 
  pickImage, 
  uploading, 
  onSignOut,
  initials,
  avatarColor
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={s.modBg}>
        <View style={s.modHeader}>
          <TouchableOpacity onPress={onClose}><Ionicons name="chevron-down" size={28} color={COLORS.PRIMARY} /></TouchableOpacity>
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
            {uploading && <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 10 }} />}
          </View>

          {editing ? (
            <View style={s.modForm}>
              <View style={s.modInputRow}><Ionicons name="person-outline" size={16} color={COLORS.SUBTEXT} /><TextInput style={s.modInput} value={draft.name} onChangeText={v => setDraft(d=>({...d, name:v}))} placeholder="Name" placeholderTextColor="#4b5563" /></View>
              <View style={s.modInputRow}><Ionicons name="call-outline" size={16} color={COLORS.SUBTEXT} /><TextInput style={s.modInput} value={draft.phone} onChangeText={v => setDraft(d=>({...d, phone:v}))} placeholder="Phone" placeholderTextColor="#4b5563" keyboardType="phone-pad" /></View>
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
              <View style={s.modRow}><Ionicons name="phone-portrait-outline" size={18} color={COLORS.PINK} /><Text style={s.modRowLabel}>Shake to SOS</Text><Switch value={true} trackColor={{ true: COLORS.PRIMARY+"80" }} thumbColor={COLORS.PRIMARY} /></View>
              <View style={s.modRow}><Ionicons name="notifications-outline" size={18} color="#f59e0b" /><Text style={s.modRowLabel}>Alerts</Text><Switch value={true} trackColor={{ true: COLORS.PRIMARY+"80" }} thumbColor={COLORS.PRIMARY} /></View>
              <TouchableOpacity style={[s.modRow, { borderBottomWidth: 0 }]} onPress={onSignOut}><Ionicons name="log-out-outline" size={18} color="#ef4444" /><Text style={[s.modRowLabel, { color: "#ef4444" }]}>Sign Out</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modBg:          { flex: 1, backgroundColor: COLORS.BG || "#0f0a1e" },
  modHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER },
  modTitle:       { color: COLORS.TEXT, fontSize: 18, fontWeight: "800" },
  modEdit:        { padding: 5 },
  modEditText:    { color: COLORS.PRIMARY, fontWeight: "600" },
  modAvatarSection: { alignItems: "center", marginVertical: 30 },
  modAvatar:      { width: 110, height: 110, borderRadius: 30, overflow: "hidden", borderWidth: 2, borderColor: COLORS.BORDER },
  modImg:         { width: "100%", height: "100%" },
  modInitials:    { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  modInitText:    { fontSize: 36, fontWeight: "900" },
  modCam:         { position: "absolute", bottom: 0, right: 0, backgroundColor: COLORS.PRIMARY, width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: COLORS.BG },
  modInfo:        { alignItems: "center", gap: 6, marginBottom: 30 },
  modNameText:    { fontSize: 26, fontWeight: "900", color: COLORS.TEXT },
  modPhoneText:   { fontSize: 15, color: COLORS.SUBTEXT },
  modForm:        { gap: 12, marginBottom: 30 },
  modInputRow:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.BORDER },
  modInput:       { flex: 1, color: COLORS.TEXT, fontSize: 15 },
  modSave:        { backgroundColor: COLORS.PRIMARY, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 10 },
  modSaveText:    { color: "white", fontWeight: "800", fontSize: 16 },
  modSection:     { gap: 10 },
  modSectionLabel: { color: COLORS.SUBTEXT, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginLeft: 4 },
  modCard:        { backgroundColor: COLORS.CARD, borderRadius: 20, borderWidth: 1, borderColor: COLORS.BORDER, overflow: "hidden" },
  modRow:         { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
  modRowLabel:    { flex: 1, color: COLORS.TEXT, fontSize: 15, fontWeight: "600" },
});
