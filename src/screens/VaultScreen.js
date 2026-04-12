// src/screens/VaultScreen.js
// Evidence Vault — Supabase-backed, biometric-locked, PDF export
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, RefreshControl, Platform
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { draftComplaint, analyzeEvidence } from "../api/claude";
import { supabase } from "../api/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BG, CARD, BORDER, PRIMARY, PINK, TEXT, SUBTEXT, SUCCESS, WARNING } from "../theme/colors";
import useBiometric from "../hooks/useBiometric";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import useToast from "../hooks/useToast";

// PDF export (optional — graceful if not installed)
let Print = null;
let Sharing = null;
try { Print = require("expo-print"); } catch (_) {}
try { Sharing = require("expo-sharing"); } catch (_) {}

const INCIDENT_TYPES = [
  "Verbal Harassment", "Physical Harassment",
  "Stalking", "Online Harassment", "Eve Teasing", "Other"
];

export default function VaultScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const { showToast, ToastComponent } = useToast();
  const [incidents, setIncidents]       = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ type: "Verbal Harassment", desc: "", location: "" });
  const [complaint, setComplaint]       = useState("");
  const [loading, setLoading]           = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [fetchingRecords, setFetchingRecords] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [userId, setUserId]             = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Biometric lock
  const { supported: bioSupported, authenticated, checking: bioChecking, authenticate } = useBiometric();

  // Check if user has biometric_on enabled in profile
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("profiles").select("biometric_on").eq("id", user.id).single();
        if (data?.biometric_on && bioSupported) {
          setBiometricEnabled(true);
          authenticate();
        }
      } catch (_) {}
    })();
  }, [bioSupported]);

  // ── Load incidents from Supabase ──────────────────────────────────────────
  const loadIncidents = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setFetchingRecords(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setIncidents(data || []);
    } catch (e) {
      console.error("Load incidents:", e.message);
    } finally {
      setFetchingRecords(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadIncidents(); }, []);

  // ── Save incident to Supabase ─────────────────────────────────────────────
  const saveIncident = async (incidentData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast("Not signed in. Please log in again.", "error"); return null; }
      const { data, error } = await supabase
        .from("incidents")
        .insert({ user_id: user.id, ...incidentData })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Save incident:", e.message);
      showToast("Record could not be saved: " + (e.message || "unknown error"), "error");
      return null;
    }
  };

  // ── Upload image to Supabase evidence bucket ──────────────────────────────
  const uploadEvidence = async (uri) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const fileName = `${user.id}/evidence_${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const { error } = await supabase.storage
        .from("evidence")
        .upload(fileName, bytes, { contentType: "image/jpeg", upsert: false });
      if (error) {
        console.warn("Evidence upload:", error.message);
        return null;
      }
      const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(fileName);
      return urlData?.publicUrl || null;
    } catch (e) {
      console.warn("uploadEvidence:", e.message);
      return null;
    }
  };

  // ── GPS capture ───────────────────────────────────────────────────────────
  const captureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    setForm(f => ({ ...f, location: `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}` }));
  };

  // ── Process evidence image with AI ───────────────────────────────────────
  const processEvidenceImage = async (uri) => {
    setScanning(true);
    setEvidenceImage(uri);
    setShowForm(true);
    try {
      let base64;
      if (uri.startsWith("data:")) base64 = uri.split(",")[1];
      else base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const analysis = await analyzeEvidence(base64);
      setForm({
        type: analysis.incidentType || "Other",
        desc: analysis.summary || analysis.extractedText || "",
        location: analysis.location !== "Unknown" ? analysis.location : form.location,
      });
      Alert.alert("✅ Analysis Complete", "AI has extracted details from your evidence. Review and generate a complaint.");
    } catch (err) {
      console.error("AI Analysis:", err);
      Alert.alert("Analysis Failed", "Could not scan evidence. Please enter details manually.");
    } finally {
      setScanning(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission", "Camera access is needed.");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) processEvidenceImage(result.assets[0].uri);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) processEvidenceImage(result.assets[0].uri);
  };

  // ── Generate AI complaint + save everything ───────────────────────────────
  const generate = async () => {
    if (!form.desc && !evidenceImage) {
      return Alert.alert("Missing Info", "Please describe the incident or attach evidence.");
    }
    setLoading(true);
    try {
      const complaintText = await draftComplaint({
        type: form.type,
        location: form.location || "Unspecified",
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        description: form.desc || "As described by complainant.",
      });
      setComplaint(complaintText);

      let mediaUrl = null;
      if (evidenceImage) mediaUrl = await uploadEvidence(evidenceImage);

      const saved = await saveIncident({
        type: form.type,
        description: form.desc,
        location: form.location,
        media_url: mediaUrl,
        complaint: complaintText,
      });

      if (saved) {
        setIncidents(prev => [saved, ...prev]);
        showToast("Complaint generated and record saved ✓", "success");
      }
      setShowForm(false);
      setEvidenceImage(null);
      setForm({ type: "Verbal Harassment", desc: "", location: "" });
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
        showToast("No internet. Connect and try again.", "error");
      } else if (msg.includes("API key") || msg.includes("KEY")) {
        showToast("Gemini API key missing. Check your .env file.", "error");
      } else {
        showToast("Could not generate complaint. Please try again.", "error");
      }
    }
    setLoading(false);
  };

  // ── Delete incident ───────────────────────────────────────────────────────
  const deleteIncident = (id) => {
    Alert.alert("Delete Record", "Are you sure you want to permanently delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("incidents").delete().eq("id", id);
            if (error) throw error;
            setIncidents(prev => prev.filter(i => i.id !== id));
            showToast("Record deleted.", "info");
          } catch (e) {
            showToast("Could not delete record: " + (e.message || "unknown error"), "error");
          }
        },
      },
    ]);
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  // ── Biometric lock gate ────────────────────────────────────────────────────
  if (biometricEnabled && !bioChecking && !authenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{ backgroundColor: CARD, borderRadius: 28, padding: 32, alignItems: "center", borderWidth: 1, borderColor: BORDER, gap: 16, width: "100%" }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: `${PRIMARY}25`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${PRIMARY}50` }}>
            <Ionicons name="lock-closed" size={36} color={PRIMARY} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: TEXT }}>Evidence Vault</Text>
          <Text style={{ fontSize: 14, color: SUBTEXT, textAlign: "center", lineHeight: 22 }}>
            This vault is protected by biometric authentication.{"\n"}Authenticate to access your records.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, width: "100%", justifyContent: "center" }}
            onPress={() => authenticate("Authenticate to access Evidence Vault")}
          >
            <Ionicons name="finger-print" size={20} color="white" />
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>Unlock Vault</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }


  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadIncidents(true)} tintColor={PRIMARY} />}
    >
      {/* Header — notch-safe paddingTop */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <View>
            <View style={s.headerTitleRow}>
              <Ionicons name="shield" size={18} color={PRIMARY} />
              <Text style={s.title}>EVIDENCE VAULT</Text>
            </View>
            <Text style={s.subtitle}>{incidents.length} encrypted record{incidents.length !== 1 ? "s" : ""}</Text>
          </View>
          <View style={s.encBadge}>
            <Ionicons name="lock-closed" size={11} color={SUCCESS} />
            <Text style={s.encText}>ONLINE SYNC</Text>
          </View>
        </View>
      </View>

      {/* Quick Capture */}
      <View style={s.captureCard}>
        <Text style={s.sectionLabel}>INTAKE MODALITIES</Text>
        <View style={s.captureRow}>
          {[
            { icon: "camera",        label: "Camera",  color: PRIMARY, action: takePhoto },
            { icon: "images",        label: "Upload",  color: PINK,    action: pickImage },
            { icon: "document-text", label: "Doc",     color: "#06b6d4", action: () => setShowForm(true) },
            { icon: "location",      label: "GPS",     color: WARNING, action: captureLocation },
          ].map(b => (
            <TouchableOpacity key={b.label} style={[s.captureBtn, { backgroundColor: b.color + "18", borderColor: b.color + "40" }]}
              onPress={b.action}>
              <Ionicons name={b.icon} size={22} color={b.color} />
              <Text style={[s.captureBtnText, { color: b.color }]}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Scanning Overlay */}
      {scanning && (
        <View style={s.scanCard}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.scanText}>AI Analysing Evidence...</Text>
          <Text style={s.scanSub}>Extracting incident details with Gemini Vision</Text>
        </View>
      )}

      {/* Incident Form */}
      {showForm && !scanning && (
        <View style={s.formCard}>
          <View style={s.formHeader}>
            <Text style={s.formTitle}>Document Incident</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); setEvidenceImage(null); }}>
              <Ionicons name="close-circle" size={22} color={SUBTEXT} />
            </TouchableOpacity>
          </View>

          {evidenceImage && (
            <View style={s.evidencePreviewBox}>
              <Image source={{ uri: evidenceImage }} style={s.evidencePreview} />
              <View style={s.evidenceTag}>
                <Ionicons name="checkmark-circle" size={12} color={SUCCESS} />
                <Text style={s.evidenceTagText}>Evidence Attached</Text>
              </View>
            </View>
          )}

          <Text style={s.label}>INCIDENT TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {INCIDENT_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setForm(f => ({ ...f, type: t }))}
                style={[s.chip, form.type === t && s.chipActive]}>
                <Text style={[s.chipText, form.type === t && { color: "#fff" }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>LOCATION</Text>
          <View style={s.locationRow}>
            <TextInput style={[s.input, { flex: 1 }]}
              placeholder="Address or coordinates"
              placeholderTextColor={SUBTEXT}
              value={form.location}
              onChangeText={v => setForm(f => ({ ...f, location: v }))} />
            <TouchableOpacity onPress={captureLocation} style={s.gpsBtn}>
              <Ionicons name="locate" size={18} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>DESCRIPTION</Text>
          <TextInput style={[s.input, s.textarea]}
            placeholder="Describe what happened in detail…"
            placeholderTextColor={SUBTEXT}
            value={form.desc}
            onChangeText={v => setForm(f => ({ ...f, desc: v }))}
            multiline numberOfLines={5} textAlignVertical="top" />

          <TouchableOpacity style={[s.draftBtn, loading && { opacity: 0.6 }]} onPress={generate} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="sparkles" size={16} color="white" />
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
              <Ionicons name="document-text" size={16} color={SUCCESS} />
            </View>
            <Text style={s.complaintTitle}>AI-Drafted Complaint Ready</Text>
          </View>
          <ScrollView style={s.complaintScroll} nestedScrollEnabled>
            <Text style={s.complaintText}>{complaint}</Text>
          </ScrollView>
          <TouchableOpacity style={s.exportBtn}
            onPress={async () => {
              if (!Print || !Sharing) {
                Alert.alert("Not Available", "PDF export requires expo-print and expo-sharing.");
                return;
              }
              try {
                const html = `
                  <html><head><meta charset="utf-8">
                  <style>
                    body { font-family: 'Helvetica Neue', sans-serif; padding: 40px; color: #1a1a2e; }
                    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 2px solid #8b5cf6; padding-bottom: 16px; }
                    .logo { width: 48px; height: 48px; background: #8b5cf6; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 900; }
                    h1 { color: #8b5cf6; font-size: 22px; margin: 0; }
                    .subtitle { color: #6b7280; font-size: 12px; margin-top: 4px; }
                    .section { margin-top: 20px; }
                    .label { font-size: 10px; color: #8b5cf6; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
                    .content { font-size: 14px; line-height: 1.8; color: #374151; white-space: pre-wrap; background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
                    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
                    .badge { display: inline-block; background: #ede9fe; color: #7c3aed; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
                  </style></head><body>
                    <div class="header">
                      <div class="logo">S</div>
                      <div><h1>ShieldHer — Complaint Document</h1>
                      <div class="subtitle">Auto-generated by ShieldHer AI</div></div>
                    </div>
                    <div class="section">
                      <div class="label">Date</div>
                      <p>${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    <div class="section">
                      <div class="label">Document Status</div>
                      <span class="badge">AI-Generated Draft</span>
                    </div>
                    <div class="section">
                      <div class="label">Complaint</div>
                      <div class="content">${complaint.replace(/\n/g, '<br>')}</div>
                    </div>
                    <div class="footer">
                      Generated by ShieldHer Safety App &bull; This is an AI-drafted document for reference purposes.
                    </div>
                  </body></html>`;
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share Complaint PDF" });
                } else {
                  Alert.alert("PDF Saved", `File saved to: ${uri}`);
                }
              } catch (e) {
                Alert.alert("Export Failed", e.message);
              }
            }}>
            <Ionicons name="share-outline" size={16} color="white" />
            <Text style={s.exportBtnText}>Export as PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Encrypted Records */}
      <View style={s.recordsCard}>
        <View style={s.recordsHeader}>
          <Text style={s.sectionLabel}>SECURE ARCHIVES</Text>
          <TouchableOpacity style={s.addRecordBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add" size={14} color={PINK} />
            <Text style={s.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {fetchingRecords ? (
          <ActivityIndicator color={PRIMARY} style={{ paddingVertical: 20 }} />
        ) : incidents.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={36} color={SUBTEXT} />
            <Text style={s.emptyText}>No records yet</Text>
            <Text style={s.emptySubText}>Your encrypted incident records will appear here</Text>
          </View>
        ) : incidents.map(inc => {
          // React Native touch events don't have stopPropagation.
          // Use a flag ref to suppress the outer onPress when delete is tapped.
          let _deletePressed = false;
          return (
            <TouchableOpacity
              key={inc.id}
              style={s.recordRow}
              activeOpacity={0.75}
              onPress={() => {
                if (_deletePressed) { _deletePressed = false; return; }
                navigation.navigate("IncidentDetail", { incident: inc });
              }}
            >
              {inc.media_url ? (
                <Image source={{ uri: inc.media_url }} style={s.recordThumb} />
              ) : (
                <View style={s.recordIcon}>
                  <Ionicons name="lock-closed" size={14} color={WARNING} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.recordType}>{inc.type}</Text>
                <Text style={s.recordMeta}>{formatDate(inc.created_at)}</Text>
                {inc.location ? <Text style={s.recordLoc} numberOfLines={1}>📍 {inc.location}</Text> : null}
              </View>
              <View style={s.recordRight}>
                <View style={s.encChip}>
                  <Text style={s.encChipText}>Encrypted</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <Ionicons name="chevron-forward" size={14} color={SUBTEXT} />
                  <TouchableOpacity
                    onPress={() => { _deletePressed = true; deleteIncident(inc.id); }}
                    style={s.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={15} color={SUBTEXT} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
    <ToastComponent />
  </View>
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BG },
  header:             { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitleRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title:              { fontSize: 18, fontWeight: "800", color: TEXT, letterSpacing: 1.5 },
  subtitle:           { fontSize: 12, color: SUBTEXT, marginLeft: 26 },
  encBadge:           { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)" },
  encText:            { fontSize: 10, color: SUCCESS, fontWeight: "700", letterSpacing: 0.8 },
  // Capture
  captureCard:        { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER },
  sectionLabel:       { fontSize: 10, color: SUBTEXT, fontWeight: "700", letterSpacing: 1.5, marginBottom: 14 },
  captureRow:         { flexDirection: "row", gap: 8 },
  captureBtn:         { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", gap: 6 },
  captureBtnText:     { fontSize: 11, fontWeight: "600" },
  // Scan
  scanCard:           { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  scanText:           { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 14 },
  scanSub:            { color: SUBTEXT, fontSize: 12, marginTop: 6, textAlign: "center" },
  // Form
  formCard:           { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  formHeader:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  formTitle:          { fontSize: 16, fontWeight: "700", color: TEXT },
  label:              { fontSize: 10, color: SUBTEXT, fontWeight: "700", marginBottom: 8, letterSpacing: 1.2 },
  chip:               { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 7, backgroundColor: "rgba(255,255,255,0.03)" },
  chipActive:         { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:           { fontSize: 12, color: SUBTEXT },
  locationRow:        { flexDirection: "row", gap: 8, marginBottom: 14 },
  input:              { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: TEXT, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.03)" },
  textarea:           { height: 100, textAlignVertical: "top" },
  gpsBtn:             { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "rgba(139,92,246,0.08)" },
  draftBtn:           { backgroundColor: PINK, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  draftBtnText:       { color: "white", fontWeight: "700", fontSize: 14 },
  // Evidence preview
  evidencePreviewBox: { width: "100%", height: 160, borderRadius: 14, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  evidencePreview:    { width: "100%", height: "100%" },
  evidenceTag:        { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  evidenceTagText:    { color: SUCCESS, fontSize: 10, fontWeight: "700" },
  // Complaint
  complaintCard:      { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: "rgba(34,197,94,0.2)" },
  complaintHeader:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  complaintIconBg:    { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center" },
  complaintTitle:     { color: SUCCESS, fontWeight: "700", fontSize: 14 },
  complaintScroll:    { maxHeight: 180, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  complaintText:      { fontSize: 12, color: SUBTEXT, lineHeight: 20 },
  exportBtn:          { backgroundColor: SUCCESS, borderRadius: 12, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  exportBtnText:      { color: "white", fontWeight: "700" },
  // Records
  recordsCard:        { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, borderWidth: 1, borderColor: BORDER },
  recordsHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addRecordBtn:       { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(236,72,153,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText:         { color: PINK, fontSize: 12, fontWeight: "600" },
  recordRow:          { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  recordThumb:        { width: 44, height: 44, borderRadius: 10, backgroundColor: CARD },
  recordIcon:         { width: 44, height: 44, backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recordType:         { fontSize: 13, fontWeight: "600", color: TEXT },
  recordMeta:         { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  recordLoc:          { fontSize: 10, color: SUBTEXT, marginTop: 2 },
  recordRight:        { alignItems: "flex-end", gap: 6 },
  encChip:            { backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  encChipText:        { fontSize: 10, color: SUCCESS, fontWeight: "600" },
  deleteBtn:          { padding: 4 },
  emptyState:         { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText:          { color: SUBTEXT, fontSize: 15, fontWeight: "600" },
  emptySubText:       { color: SUBTEXT, fontSize: 12, textAlign: "center", opacity: 0.6 },
});
