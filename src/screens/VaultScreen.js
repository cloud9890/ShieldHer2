// screens/VaultScreen.js
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { draftComplaint, analyzeEvidence } from "../api/claude";
import { supabase } from "../api/supabase";
import { Ionicons } from "@expo/vector-icons";

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const INCIDENT_TYPES = ["Verbal Harassment", "Physical Harassment", "Stalking", "Online Harassment", "Eve Teasing", "Other"];

export default function VaultScreen() {
  const [incidents, setIncidents] = useState([
    { id: 1, type: "Verbal Harassment", date: "Mar 22, 2026", location: "MG Road Metro" },
  ]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ type: "Verbal Harassment", desc: "", location: "" });
  const [complaint, setComplaint]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [evidenceImage, setEvidenceImage] = useState(null);

  const captureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    setForm(f => ({ ...f, location: `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}` }));
  };

  const processEvidenceImage = async (uri) => {
    setScanning(true);
    setEvidenceImage(uri);
    setShowForm(true);

    try {
      // 1. Convert to Base64 for Gemini
      let base64;
      if (uri.startsWith("data:")) {
        base64 = uri.split(",")[1];
      } else {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      }

      // 2. Upload to Supabase 'evidence' bucket
      const fileName = `evidence_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("file", { uri, name: fileName, type: "image/jpeg" });
      
      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(fileName, formData);

      if (uploadError) console.error("Upload failed but continuing with AI:", uploadError);

      // 3. AI Analysis
      const analysis = await analyzeEvidence(base64);
      
      setForm({
        type: analysis.incidentType || "Other",
        desc: analysis.summary || analysis.extractedText || "",
        location: analysis.location !== "Unknown" ? analysis.location : form.location
      });

      Alert.alert("Analysis Complete", "AI has extracted details from the evidence.");
    } catch (err) {
      console.error("AI Analysis Error:", err);
      Alert.alert("Analysis Failed", "Could not scan evidence. Please enter details manually.");
    } finally {
      setScanning(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Camera access is needed.");

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      processEvidenceImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      processEvidenceImage(result.assets[0].uri);
    }
  };

  const generate = async () => {
    setLoading(true);

    try {
      const text = await draftComplaint({
        type: form.type,
        location: form.location || "Unspecified",
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        description: form.desc || "As described by complainant.",
      });
      setComplaint(text);
      setIncidents(prev => [...prev, { id: Date.now(), type: form.type, date: new Date().toLocaleDateString(), location: form.location || "Current Location" }]);
      setShowForm(false);
    } catch {
      Alert.alert("Error", "Could not generate complaint. Please try again.");
    }
    setLoading(false);
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Evidence Vault</Text>
            <Text style={s.subtitle}>{incidents.length} incident{incidents.length !== 1 ? "s" : ""} documented</Text>
          </View>
          <View style={s.encBadge}>
            <Ionicons name="lock-closed" size={12} color="#34d399" />
            <Text style={s.encText}>AES-256</Text>
          </View>
        </View>
      </View>

      {/* Quick Capture */}
      <View style={s.captureCard}>
        <View style={s.captureCardHeader}>
          <Text style={s.captureTitle}>Quick Capture</Text>
          <Text style={s.captureSub}>Save evidence instantly</Text>
        </View>
        <View style={s.captureRow}>
          {[
            { icon: "camera",         label: "Photo",    color: "#8b5cf6", action: takePhoto },
            { icon: "images",         label: "Gallery",  color: "#ec4899", action: pickImage },
            { icon: "location",       label: "GPS",      color: "#06b6d4", action: captureLocation },
            { icon: "document-text",  label: "Describe", color: "#f59e0b", action: () => setShowForm(true) },
          ].map(b => (
            <TouchableOpacity key={b.label} style={[s.captureBtn, { borderColor: b.color + "40" }]}
              onPress={b.action}>
              <View style={[s.captureBtnIcon, { backgroundColor: b.color + "18" }]}>
                <Ionicons name={b.icon} size={20} color={b.color} />
              </View>
              <Text style={[s.captureBtnText, { color: b.color }]}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Scanning Overlay */}
      {scanning && (
        <View style={s.scanOverlay}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.scanText}>AI is analyzing your evidence...</Text>
          <Text style={s.scanSub}>Extracting details and summarizing incident</Text>
        </View>
      )}

      {/* Form */}
      {showForm && (
        <View style={s.formCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={s.formTitle}>Document Incident</Text>
            <TouchableOpacity onPress={() => {setShowForm(false); setEvidenceImage(null);}}>
              <Ionicons name="close" size={20} color={SUBTEXT} />
            </TouchableOpacity>
          </View>

          {evidenceImage && (
            <View style={s.evidencePreviewBox}>
              <Image source={{ uri: evidenceImage }} style={s.evidencePreview} />
              <View style={s.evidenceTag}>
                <Ionicons name="checkmark-circle" size={12} color="#34d399" />
                <Text style={s.evidenceTagText}>Evidence Attached</Text>
              </View>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {INCIDENT_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, type: t }))}
                style={[s.chip, form.type === t && s.chipActive]}>
                <Text style={[s.chipText, form.type === t && { color: "white" }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Location</Text>
          <View style={s.locationRow}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Address or coordinates" placeholderTextColor="#374151" value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} />
            <TouchableOpacity onPress={captureLocation} style={s.gpsBtn}>
              <Ionicons name="locate" size={18} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Description</Text>
          <TextInput style={[s.input, s.textarea]} placeholder="Describe what happened…" placeholderTextColor="#374151" value={form.desc} onChangeText={v => setForm(f => ({ ...f, desc: v }))} multiline numberOfLines={4} textAlignVertical="top" />

          <TouchableOpacity style={[s.draftBtn, loading && { opacity: 0.6 }]} onPress={generate} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="document-text" size={16} color="white" />
                <Text style={s.draftBtnText}>Generate AI Complaint</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Generated Complaint */}
      {complaint !== "" && (
        <View style={s.complaintCard}>
          <View style={s.complaintHeader}>
            <View style={s.complaintIconBg}>
              <Ionicons name="document-text" size={16} color="#34d399" />
            </View>
            <Text style={s.complaintTitle}>AI-Drafted Complaint Ready</Text>
          </View>
          <ScrollView style={s.complaintScroll} nestedScrollEnabled>
            <Text style={s.complaintText}>{complaint}</Text>
          </ScrollView>
          <TouchableOpacity style={s.exportBtn}>
            <Ionicons name="share-outline" size={16} color="white" />
            <Text style={s.exportBtnText}>Export as PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Records */}
      <View style={s.recordsCard}>
        <View style={s.recordsHeader}>
          <Text style={s.formTitle}>My Records</Text>
          {!showForm && (
            <TouchableOpacity style={s.addRecordBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add" size={16} color={PINK} />
              <Text style={[s.addBtnText]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        {incidents.map(inc => (
          <View key={inc.id} style={s.recordRow}>
            <View style={s.recordIcon}>
              <Ionicons name="lock-closed" size={14} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.recordType}>{inc.type}</Text>
              <Text style={s.recordMeta}>{inc.date} · {inc.location}</Text>
            </View>
            <View style={s.encChip}>
              <Text style={s.encChipText}>Encrypted</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BG },
  header:          { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title:           { fontSize: 24, fontWeight: "800", color: TEXT },
  subtitle:        { fontSize: 12, color: PRIMARY, marginTop: 4, fontWeight: "600" },
  encBadge:        { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "rgba(52,211,153,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  encText:         { fontSize: 11, color: "#34d399", fontWeight: "700" },
  // Capture
  captureCard:     { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER },
  captureCardHeader: { marginBottom: 14 },
  captureTitle:    { color: TEXT, fontWeight: "700", fontSize: 15 },
  captureSub:      { color: SUBTEXT, fontSize: 11, marginTop: 2 },
  captureRow:      { flexDirection: "row", gap: 8 },
  captureBtn:      { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.02)" },
  captureBtnIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  captureBtnText:  { fontSize: 11, fontWeight: "600" },
  // Form
  formCard:        { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  formTitle:       { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 14 },
  label:           { fontSize: 11, color: "#6b7280", fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  chip:            { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 7, backgroundColor: "rgba(255,255,255,0.02)" },
  chipActive:      { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:        { fontSize: 12, color: SUBTEXT },
  locationRow:     { flexDirection: "row", gap: 8, marginBottom: 14 },
  input:           { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: TEXT, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.03)" },
  textarea:        { height: 90, textAlignVertical: "top", marginBottom: 14 },
  gpsBtn:          { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "rgba(139,92,246,0.08)" },
  draftBtn:        { backgroundColor: PINK, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  draftBtnText:    { color: "white", fontWeight: "700", fontSize: 14 },
  // Complaint
  complaintCard:   { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  complaintHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  complaintIconBg: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(52,211,153,0.12)", alignItems: "center", justifyContent: "center" },
  complaintTitle:  { color: "#34d399", fontWeight: "700", fontSize: 14 },
  complaintScroll: { maxHeight: 180, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  complaintText:   { fontSize: 12, color: SUBTEXT, lineHeight: 19 },
  exportBtn:       { backgroundColor: "#34d399", borderRadius: 12, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  exportBtnText:   { color: "white", fontWeight: "700" },
  // Records
  recordsCard:     { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, borderWidth: 1, borderColor: BORDER },
  recordsHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addRecordBtn:    { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(236,72,153,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText:      { color: PINK, fontSize: 12, fontWeight: "600" },
  recordRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  recordIcon:      { width: 36, height: 36, backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recordType:      { fontSize: 13, fontWeight: "600", color: TEXT },
  recordMeta:      { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  encChip:         { backgroundColor: "rgba(52,211,153,0.08)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  encChipText:     { fontSize: 10, color: "#34d399", fontWeight: "600" },
  // Scan UI
  scanOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,10,30,0.95)", zIndex: 100, alignItems: "center", justifyContent: "center", padding: 40 },
  scanText:        { color: TEXT, fontSize: 18, fontWeight: "700", marginTop: 20 },
  scanSub:         { color: SUBTEXT, fontSize: 13, marginTop: 8, textAlign: "center" },
  evidencePreviewBox: { width: "100%", height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  evidencePreview: { width: "100%", height: "100%", opacity: 0.6 },
  evidenceTag:     { position: "absolute", bottom: 10, left: 10, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  evidenceTagText: { color: "#34d399", fontSize: 10, fontWeight: "700" },
});

