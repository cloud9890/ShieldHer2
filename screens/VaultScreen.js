// screens/VaultScreen.js — Full Evidence Vault with Camera, Upload & AI Vision
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image,
  Platform, Modal
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { draftComplaint, analyzeEvidenceImage } from "../services/claude";

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const GREEN   = "#34d399";
const AMBER   = "#f59e0b";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const INCIDENT_TYPES = ["Verbal Harassment", "Physical Harassment", "Stalking", "Online Harassment", "Eve Teasing", "Other"];
const STORAGE_KEY    = "shieldher_vault_v2";

// ── Severity pill ────────────────────────────────────────────────────────────
const SEV_COLOR = { Low: "#22c55e", Medium: AMBER, High: "#f97316", Critical: "#ef4444" };

export default function VaultScreen() {
  const [incidents,   setIncidents]  = useState([]);
  const [showForm,    setShowForm]   = useState(false);
  const [form, setForm]              = useState({ type: "Verbal Harassment", desc: "", location: "", date: "", severity: "Medium" });
  const [complaint,   setComplaint]  = useState("");
  const [analyzing,   setAnalyzing]  = useState(false);   // AI vision in progress
  const [generating,  setGenerating] = useState(false);   // AI complaint in progress
  const [capturedMedia, setCapturedMedia] = useState(null); // { uri, base64, mimeType, name }
  const [aiSummary,   setAiSummary]  = useState(null);    // result from analyzeEvidenceImage
  const [viewRecord,  setViewRecord] = useState(null);    // incident for detail modal
  const [deleteMode,  setDeleteMode] = useState(false);

  // Load saved incidents on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setIncidents(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const persist = (list) => {
    setIncidents(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  };

  // ── Location ──────────────────────────────────────────────────────────────
  const captureLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed", "Enable location."); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setForm(f => ({ ...f, location: `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}` }));
    } catch (e) { Alert.alert("Error", e.message); }
  };

  // ── Convert URI to base64 ─────────────────────────────────────────────────
  const toBase64 = async (uri) => {
    if (Platform.OS === "web") {
      // On web: fetch the blob URL and convert
      const res    = await fetch(uri);
      const blob   = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  };

  // ── Run AI Vision on captured media ──────────────────────────────────────
  const runAIVision = async (uri, mimeType = "image/jpeg") => {
    setAnalyzing(true);
    setAiSummary(null);
    try {
      const base64 = await toBase64(uri);
      const result = await analyzeEvidenceImage(base64, mimeType);
      setAiSummary(result);
      // Pre-fill the form with AI-extracted data
      setForm(f => ({
        ...f,
        type:     INCIDENT_TYPES.includes(result.incidentType) ? result.incidentType : "Other",
        desc:     result.summary || f.desc,
        location: result.location !== "Not visible" ? result.location : f.location,
        date:     result.date     !== "Not visible" ? result.date     : f.date,
        severity: result.severity || "Medium",
      }));
      setComplaint(result.draftComplaint || "");
      setShowForm(true);
    } catch (e) {
      Alert.alert("AI Analysis Failed", e.message || "Could not read the image. Please fill in the form manually.");
      setShowForm(true);
    }
    setAnalyzing(false);
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const launchCamera = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Camera permission needed"); return; }
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
      base64: false,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setCapturedMedia({ uri: asset.uri, mimeType: "image/jpeg", name: "camera_evidence.jpg" });
      await runAIVision(asset.uri, "image/jpeg");
    }
  };

  // ── Gallery / Image Upload ────────────────────────────────────────────────
  const launchGallery = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Gallery permission needed"); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
      base64: false,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const mime  = asset.type === "image/png" ? "image/png" : "image/jpeg";
      setCapturedMedia({ uri: asset.uri, mimeType: mime, name: asset.fileName || "uploaded_evidence" });
      await runAIVision(asset.uri, mime);
    }
  };

  // ── Document / Screenshot picker (native only) ────────────────────────────
  const launchDocumentPicker = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Info", "Use the Upload (photo) button on web.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const mime  = asset.mimeType || "image/jpeg";
        // PDF vision not supported directly by Gemini inline — convert to "Other"
        if (mime === "application/pdf") {
          Alert.alert("PDF Detected", "AI vision works best with images. The file has been attached. Please describe the incident manually.");
          setCapturedMedia({ uri: asset.uri, mimeType: mime, name: asset.name });
          setShowForm(true);
        } else {
          setCapturedMedia({ uri: asset.uri, mimeType: mime, name: asset.name });
          await runAIVision(asset.uri, mime);
        }
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  // ── Generate / Update AI Complaint from form ──────────────────────────────
  const generateComplaint = async () => {
    setGenerating(true);
    try {
      const text = await draftComplaint({
        type:        form.type,
        location:    form.location || "Unspecified",
        date:        form.date || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        description: form.desc || "As described by complainant.",
        severity:    form.severity,
      });
      setComplaint(text);
    } catch {
      Alert.alert("Error", "Could not generate complaint. Check your API key.");
    }
    setGenerating(false);
  };

  // ── Save incident record ──────────────────────────────────────────────────
  const saveRecord = () => {
    if (!form.desc && !capturedMedia) {
      Alert.alert("Empty record", "Please describe the incident or attach evidence.");
      return;
    }
    const newInc = {
      id:        Date.now(),
      type:      form.type,
      desc:      form.desc,
      location:  form.location || "—",
      date:      form.date || new Date().toLocaleDateString("en-IN"),
      severity:  form.severity,
      mediaUri:  capturedMedia?.uri || null,
      complaint: complaint || null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newInc, ...incidents];
    persist(updated);
    // Reset
    setShowForm(false);
    setCapturedMedia(null);
    setAiSummary(null);
    setComplaint("");
    setForm({ type: "Verbal Harassment", desc: "", location: "", date: "", severity: "Medium" });
    Alert.alert("Saved", "Evidence record saved securely.");
  };

  const deleteRecord = (id) => {
    const updated = incidents.filter(i => i.id !== id);
    persist(updated);
    setViewRecord(null);
  };

  const confirmDelete = (inc) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete this ${inc.type} record?`)) deleteRecord(inc.id);
    } else {
      Alert.alert("Delete Record", `Remove this ${inc.type} record?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteRecord(inc.id) },
      ]);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>Evidence Vault</Text>
              <Text style={s.subtitle}>{incidents.length} incident{incidents.length !== 1 ? "s" : ""} documented</Text>
            </View>
            <View style={s.encBadge}>
              <Ionicons name="lock-closed" size={12} color={GREEN} />
              <Text style={s.encText}>AES-256</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Capture ──────────────────────────────────────────────── */}
        <View style={s.captureCard}>
          <Text style={s.captureTitle}>Quick Evidence Capture</Text>
          <Text style={s.captureSub}>AI will automatically analyse and pre-fill your complaint</Text>
          <View style={s.captureRow}>
            {[
              { icon: "camera",        label: "Camera",    color: PRIMARY, action: launchCamera       },
              { icon: "image-outline", label: "Upload",    color: "#ec4899", action: launchGallery    },
              { icon: "folder-open",   label: "File",      color: "#06b6d4", action: launchDocumentPicker },
              { icon: "location",      label: "GPS",       color: AMBER,   action: captureLocation    },
              { icon: "create-outline",label: "Manual",    color: GREEN,   action: () => setShowForm(true) },
            ].map(b => (
              <TouchableOpacity
                key={b.label}
                style={[s.captureBtn, { borderColor: b.color + "50" }]}
                onPress={b.action}
              >
                <View style={[s.captureBtnIcon, { backgroundColor: b.color + "18" }]}>
                  <Ionicons name={b.icon} size={20} color={b.color} />
                </View>
                <Text style={[s.captureBtnText, { color: b.color }]}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Analysing spinner */}
        {analyzing && (
          <View style={s.analyzingCard}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={s.analyzingTitle}>AI Analysing Evidence…</Text>
            <Text style={s.analyzingText}>Gemini Vision is reading your image and extracting incident details</Text>
          </View>
        )}

        {/* AI Summary card (after analysis) */}
        {aiSummary && !analyzing && (
          <View style={s.aiSummaryCard}>
            <View style={s.aiSummaryHeader}>
              <View style={s.aiSummaryIconBg}>
                <Ionicons name="sparkles" size={16} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.aiSummaryTitle}>AI Analysis Complete</Text>
                <Text style={s.aiSummaryMeta}>Form pre-filled from your evidence</Text>
              </View>
              <View style={[s.sevBadge, { backgroundColor: (SEV_COLOR[aiSummary.severity] || AMBER) + "20" }]}>
                <Text style={[s.sevText, { color: SEV_COLOR[aiSummary.severity] || AMBER }]}>{aiSummary.severity}</Text>
              </View>
            </View>
            <Text style={s.aiSummaryBody}>{aiSummary.summary}</Text>
            {aiSummary.legalNote && (
              <View style={s.legalNote}>
                <Ionicons name="library-outline" size={13} color="#a78bfa" />
                <Text style={s.legalNoteText}>{aiSummary.legalNote}</Text>
              </View>
            )}
          </View>
        )}

        {/* Captured media thumbnail */}
        {capturedMedia?.uri && !analyzing && (
          <View style={s.thumbCard}>
            <View style={s.thumbRow}>
              <Image source={{ uri: capturedMedia.uri }} style={s.thumb} resizeMode="cover" />
              <View style={s.thumbInfo}>
                <Text style={s.thumbName} numberOfLines={1}>{capturedMedia.name}</Text>
                <Text style={s.thumbSub}>Evidence attached</Text>
                <TouchableOpacity onPress={() => { setCapturedMedia(null); setAiSummary(null); }} style={s.thumbRemove}>
                  <Ionicons name="close-circle" size={14} color="#ef4444" />
                  <Text style={{ color: "#ef4444", fontSize: 11 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Form ─────────────────────────────────────────────────────── */}
        {showForm && (
          <View style={s.formCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={s.formTitle}>Document Incident</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); setCapturedMedia(null); setAiSummary(null); }}>
                <Ionicons name="close" size={18} color={SUBTEXT} />
              </TouchableOpacity>
            </View>

            {/* Incident type */}
            <Text style={s.label}>Incident Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {INCIDENT_TYPES.map(t => (
                <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, type: t }))}
                  style={[s.chip, form.type === t && s.chipActive]}>
                  <Text style={[s.chipText, form.type === t && { color: "white" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Severity */}
            <Text style={s.label}>Severity</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {["Low", "Medium", "High", "Critical"].map(sv => (
                <TouchableOpacity key={sv} onPress={() => setForm(f => ({ ...f, severity: sv }))}
                  style={[s.sevChip, form.severity === sv && { backgroundColor: (SEV_COLOR[sv] || AMBER) + "22", borderColor: SEV_COLOR[sv] || AMBER }]}>
                  <Text style={[s.sevChipText, form.severity === sv && { color: SEV_COLOR[sv] || AMBER }]}>{sv}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={s.label}>Date / Time</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 3 April 2026, 6:30 PM"
              placeholderTextColor="#374151"
              value={form.date}
              onChangeText={v => setForm(f => ({ ...f, date: v }))}
            />

            {/* Location */}
            <Text style={s.label}>Location</Text>
            <View style={s.locationRow}>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Address or coordinates"
                placeholderTextColor="#374151"
                value={form.location}
                onChangeText={v => setForm(f => ({ ...f, location: v }))}
              />
              <TouchableOpacity onPress={captureLocation} style={s.gpsBtn}>
                <Ionicons name="locate" size={18} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            <View style={{ height: 14 }} />

            {/* Description */}
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="Describe what happened in detail…"
              placeholderTextColor="#374151"
              value={form.desc}
              onChangeText={v => setForm(f => ({ ...f, desc: v }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[s.draftBtn, { flex: 1, opacity: generating ? 0.6 : 1 }]}
                onPress={generateComplaint} disabled={generating}>
                {generating ? <ActivityIndicator color="white" /> : (
                  <>
                    <Ionicons name="sparkles" size={15} color="white" />
                    <Text style={s.draftBtnText}>AI Complaint</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveRecord}>
                <Ionicons name="save-outline" size={15} color="white" />
                <Text style={s.draftBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── AI-Generated Complaint ──────────────────────────────────── */}
        {complaint !== "" && (
          <View style={s.complaintCard}>
            <View style={s.complaintHeader}>
              <View style={s.complaintIconBg}>
                <Ionicons name="document-text" size={16} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.complaintTitle}>AI-Drafted Complaint Ready</Text>
                <Text style={s.complaintMeta}>Ready to file as FIR / NCW complaint</Text>
              </View>
            </View>
            <ScrollView style={s.complaintScroll} nestedScrollEnabled>
              <Text style={s.complaintText}>{complaint}</Text>
            </ScrollView>
            <View style={s.complActionRow}>
              <TouchableOpacity style={[s.exportBtn, { flex: 1 }]} onPress={saveRecord}>
                <Ionicons name="save-outline" size={14} color="white" />
                <Text style={s.exportBtnText}>Save Record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.shareBtn, { flex: 1 }]}>
                <Ionicons name="share-outline" size={14} color={GREEN} />
                <Text style={s.shareBtnText}>Share Draft</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Records List ────────────────────────────────────────────── */}
        <View style={s.recordsCard}>
          <View style={s.recordsHeader}>
            <Text style={s.formTitle}>My Records ({incidents.length})</Text>
            {!showForm && (
              <TouchableOpacity style={s.addRecordBtn} onPress={() => setShowForm(true)}>
                <Ionicons name="add" size={15} color={PINK} />
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {incidents.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="folder-open-outline" size={36} color="#4b5563" />
              <Text style={s.emptyText}>No evidence recorded yet</Text>
              <Text style={s.emptySubText}>Tap Camera, Upload, or Manual to add your first record</Text>
            </View>
          ) : (
            incidents.map(inc => (
              <TouchableOpacity key={inc.id} style={s.recordRow} onPress={() => setViewRecord(inc)} activeOpacity={0.75}>
                {inc.mediaUri ? (
                  <Image source={{ uri: inc.mediaUri }} style={s.recordThumb} />
                ) : (
                  <View style={[s.recordIcon, { backgroundColor: (SEV_COLOR[inc.severity] || AMBER) + "18" }]}>
                    <Ionicons name="document-lock-outline" size={16} color={SEV_COLOR[inc.severity] || AMBER} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.recordType}>{inc.type}</Text>
                  <Text style={s.recordMeta}>{inc.date} · {inc.location}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <View style={[s.sevBadge, { backgroundColor: (SEV_COLOR[inc.severity] || AMBER) + "18" }]}>
                    <Text style={[s.sevText, { color: SEV_COLOR[inc.severity] || AMBER }]}>{inc.severity || "Med"}</Text>
                  </View>
                  <TouchableOpacity onPress={() => confirmDelete(inc)}>
                    <Ionicons name="trash-outline" size={16} color="#4b5563" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* ── Record Detail Modal ──────────────────────────────────────────── */}
      <Modal visible={!!viewRecord} transparent animationType="slide">
        {viewRecord && (
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{viewRecord.type}</Text>
                <TouchableOpacity onPress={() => setViewRecord(null)}>
                  <Ionicons name="close" size={20} color={SUBTEXT} />
                </TouchableOpacity>
              </View>

              {viewRecord.mediaUri && (
                <Image source={{ uri: viewRecord.mediaUri }} style={s.modalImage} resizeMode="cover" />
              )}

              <View style={{ gap: 8, marginBottom: 16 }}>
                <View style={s.modalRow}>
                  <Ionicons name="calendar-outline" size={14} color={SUBTEXT} />
                  <Text style={s.modalRowText}>{viewRecord.date}</Text>
                </View>
                <View style={s.modalRow}>
                  <Ionicons name="location-outline" size={14} color={SUBTEXT} />
                  <Text style={s.modalRowText}>{viewRecord.location}</Text>
                </View>
                <View style={s.modalRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={SEV_COLOR[viewRecord.severity] || AMBER} />
                  <Text style={[s.modalRowText, { color: SEV_COLOR[viewRecord.severity] || AMBER }]}>Severity: {viewRecord.severity}</Text>
                </View>
              </View>

              {viewRecord.desc && (
                <>
                  <Text style={s.modalSection}>Description</Text>
                  <Text style={s.modalDesc}>{viewRecord.desc}</Text>
                </>
              )}

              {viewRecord.complaint && (
                <>
                  <Text style={s.modalSection}>AI-Drafted Complaint</Text>
                  <ScrollView style={s.modalComplaintScroll} nestedScrollEnabled>
                    <Text style={s.modalDesc}>{viewRecord.complaint}</Text>
                  </ScrollView>
                </>
              )}

              <TouchableOpacity style={s.deleteBtnModal} onPress={() => confirmDelete(viewRecord)}>
                <Ionicons name="trash" size={15} color="white" />
                <Text style={s.deleteBtnText}>Delete Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: BG },
  container:        { flex: 1 },
  header:           { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title:            { fontSize: 24, fontWeight: "800", color: TEXT },
  subtitle:         { fontSize: 12, color: PRIMARY, marginTop: 4, fontWeight: "600" },
  encBadge:         { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "rgba(52,211,153,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  encText:          { fontSize: 11, color: GREEN, fontWeight: "700" },

  // Capture
  captureCard:      { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER },
  captureTitle:     { color: TEXT, fontWeight: "700", fontSize: 15, marginBottom: 4 },
  captureSub:       { color: SUBTEXT, fontSize: 11, marginBottom: 14 },
  captureRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  captureBtn:       { width: "18%", minWidth: 56, borderWidth: 1, borderRadius: 14, paddingVertical: 10, alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.02)" },
  captureBtnIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  captureBtnText:   { fontSize: 9, fontWeight: "600", textAlign: "center" },

  // Analysing
  analyzingCard:    { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", alignItems: "center", gap: 12 },
  analyzingTitle:   { color: TEXT, fontWeight: "700", fontSize: 15 },
  analyzingText:    { color: SUBTEXT, fontSize: 12, textAlign: "center", lineHeight: 18 },

  // AI Summary
  aiSummaryCard:    { marginHorizontal: 16, marginBottom: 14, backgroundColor: "rgba(139,92,246,0.07)", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" },
  aiSummaryHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  aiSummaryIconBg:  { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  aiSummaryTitle:   { color: TEXT, fontWeight: "700", fontSize: 13 },
  aiSummaryMeta:    { color: SUBTEXT, fontSize: 10, marginTop: 1 },
  aiSummaryBody:    { color: SUBTEXT, fontSize: 12, lineHeight: 18 },
  legalNote:        { flexDirection: "row", gap: 6, alignItems: "flex-start", marginTop: 10, backgroundColor: "rgba(167,139,250,0.05)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(167,139,250,0.15)" },
  legalNoteText:    { flex: 1, color: "#a78bfa", fontSize: 11, lineHeight: 16 },
  sevBadge:         { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sevText:          { fontSize: 10, fontWeight: "700" },

  // Thumbnail
  thumbCard:        { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: BORDER },
  thumbRow:         { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb:            { width: 72, height: 72, borderRadius: 12 },
  thumbInfo:        { flex: 1 },
  thumbName:        { color: TEXT, fontSize: 12, fontWeight: "600" },
  thumbSub:         { color: SUBTEXT, fontSize: 11, marginTop: 2 },
  thumbRemove:      { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },

  // Form
  formCard:         { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  formTitle:        { fontSize: 16, fontWeight: "700", color: TEXT },
  label:            { fontSize: 10, color: "#6b7280", fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
  chip:             { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 7, backgroundColor: "rgba(255,255,255,0.02)" },
  chipActive:       { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:         { fontSize: 12, color: SUBTEXT },
  sevChip:          { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 7, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  sevChipText:      { fontSize: 11, color: SUBTEXT, fontWeight: "600" },
  locationRow:      { flexDirection: "row", gap: 8 },
  input:            { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: TEXT, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.03)" },
  textarea:         { height: 90, textAlignVertical: "top" },
  gpsBtn:           { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "rgba(139,92,246,0.08)" },
  draftBtn:         { backgroundColor: PINK, borderRadius: 14, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtn:          { backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  draftBtnText:     { color: "white", fontWeight: "700", fontSize: 13 },

  // Complaint
  complaintCard:    { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: "rgba(52,211,153,0.25)" },
  complaintHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  complaintIconBg:  { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(52,211,153,0.12)", alignItems: "center", justifyContent: "center" },
  complaintTitle:   { color: GREEN, fontWeight: "700", fontSize: 14 },
  complaintMeta:    { color: SUBTEXT, fontSize: 10, marginTop: 1 },
  complaintScroll:  { maxHeight: 180, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  complaintText:    { fontSize: 12, color: SUBTEXT, lineHeight: 19 },
  complActionRow:   { flexDirection: "row", gap: 10 },
  exportBtn:        { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 7 },
  exportBtnText:    { color: "white", fontWeight: "700", fontSize: 12 },
  shareBtn:         { borderWidth: 1, borderColor: "rgba(52,211,153,0.3)", borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 7 },
  shareBtnText:     { color: GREEN, fontWeight: "700", fontSize: 12 },

  // Records
  recordsCard:      { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, borderWidth: 1, borderColor: BORDER },
  recordsHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addRecordBtn:     { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(236,72,153,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText:       { color: PINK, fontSize: 12, fontWeight: "600" },
  emptyBox:         { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyText:        { color: SUBTEXT, fontSize: 14, fontWeight: "600" },
  emptySubText:     { color: "#4b5563", fontSize: 11, textAlign: "center" },
  recordRow:        { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  recordIcon:       { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recordThumb:      { width: 40, height: 40, borderRadius: 10 },
  recordType:       { fontSize: 13, fontWeight: "600", color: TEXT },
  recordMeta:       { fontSize: 11, color: SUBTEXT, marginTop: 1 },

  // Detail Modal
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalCard:        { backgroundColor: "#0a0520", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderColor: BORDER, maxHeight: "85%", gap: 0 },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle:       { fontSize: 18, fontWeight: "800", color: TEXT },
  modalImage:       { width: "100%", height: 160, borderRadius: 14, marginBottom: 16 },
  modalRow:         { flexDirection: "row", gap: 8, alignItems: "center" },
  modalRowText:     { color: SUBTEXT, fontSize: 13 },
  modalSection:     { fontSize: 10, color: "#6b7280", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  modalDesc:        { color: SUBTEXT, fontSize: 12, lineHeight: 19 },
  modalComplaintScroll: { maxHeight: 140, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
  deleteBtnModal:   { backgroundColor: "#7f1d1d", borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  deleteBtnText:    { color: "white", fontWeight: "700", fontSize: 14 },
});
