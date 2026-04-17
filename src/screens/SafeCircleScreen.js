// src/screens/SafeCircleScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Animated, Modal, Platform, ActivityIndicator
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  sendSOSAlert, sendEscortSOS, startLocationWatch, stopLocationWatch,
  createLiveSession, endLiveSession, getCurrentLocation
} from "../api/sos";
import { personaliseSOSMessage } from "../api/gemini";
import { BG, CARD, BORDER, PRIMARY, DANGER, SUCCESS, TEXT, SUBTEXT, MUTED, WARNING } from "../theme/colors";
import { supabase } from "../api/supabase";
import useContacts from "../hooks/useContacts";

const REPORT_CATEGORIES = [
  { label: "Poor Lighting", icon: "bulb-outline" },
  { label: "Suspicious Person", icon: "person-outline" },
  { label: "No Footpath", icon: "warning-outline" },
  { label: "Harassment Spot", icon: "alert-circle-outline" },
  { label: "Isolated Area", icon: "moon-outline" },
  { label: "Unsafe Traffic", icon: "car-outline" },
];

export default function SafeCircleScreen() {
  const insets = useSafeAreaInsets();
  // ✅ Use Supabase-backed contacts hook (survives reinstalls)
  const { contacts, addContact: addContactToSupabase, removeContact: removeContactFromSupabase } = useContacts();
  const [escortActive, setEscortActive] = useState(false);
  const [escortLoading, setEscortLoading] = useState(false); // acquiring GPS lock
  const [escortTime, setEscortTime] = useState(0);
  const [trackUrl, setTrackUrl] = useState(null);
  const [reports, setReports] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });
  const [selectedCat, setSelectedCat] = useState(null);
  const [reportArea, setReportArea] = useState("");
  const [location, setLocation] = useState(null);
  
  // AI-7: Context
  const [customContext, setCustomContext] = useState("");

  const timerRef = useRef(null);
  const liveLocRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const r = await AsyncStorage.getItem("shieldher_reports");
        if (r) setReports(JSON.parse(r));
      } catch (_) { }
    })();
  }, []);

  useEffect(() => () => {
    stopLocationWatch();
    clearInterval(timerRef.current);
    endLiveSession().catch(() => { });
  }, []);

  useEffect(() => {
    if (escortActive) {
      timerRef.current = setInterval(() => setEscortTime(t => t + 1), 1000);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      clearInterval(timerRef.current);
      setEscortTime(0);
      pulseAnim.setValue(1);
    }
    return () => clearInterval(timerRef.current);
  }, [escortActive]);

  const saveReports = async (r) => {
    setReports(r);
    await AsyncStorage.setItem("shieldher_reports", JSON.stringify(r));
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const triggerSOS = async () => {
    if (contacts.length === 0) {
      Alert.alert("No Contacts", "Please add contacts to your SafeCircle first.");
      return;
    }
    Alert.alert("🚨 Trigger Emergency SOS?", "This will send your live location to all contacts immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "SEND SOS", style: "destructive", onPress: async () => {
          setEscortLoading(true);
          let coords = liveLocRef.current;
          try {
            const loc = await getCurrentLocation();
            coords = loc; liveLocRef.current = loc; setLocation(loc);
          } catch (_) { }
          
          let customMsg = null;
          if (customContext.trim()) {
            try {
              customMsg = await personaliseSOSMessage(customContext, `${coords?.latitude}, ${coords?.longitude}`);
            } catch(e) {}
          }

          const res = await sendSOSAlert(contacts, "sos", coords, customMsg);
          setEscortLoading(false);
          if (res.success) Alert.alert("✅ SOS Dispatched", `Sent to ${res.sent} contacts.`);
          else Alert.alert("Error", res.error);
        }
      }
    ]);
  };

  const startEscort = async () => {
    if (contacts.length === 0) {
      Alert.alert("No Contacts", "Please add contacts to start Live Escort.");
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: "denied" }));
    if (status !== "granted") {
      Alert.alert("Permission Required", "Location access is required for live escort.");
      return;
    }
    try {
      setEscortLoading(true); // show spinner while acquiring GPS lock

      // Create the Supabase live session record first
      const sessionId = await createLiveSession();

      // Start GPS watch — resolves with FIRST real coordinates (or null after 5s timeout)
      const firstCoords = await startLocationWatch((coords) => {
        liveLocRef.current = coords;
        setLocation(coords);
      });

      if (!firstCoords) {
        // Couldn't get location — still start escort but warn user
        console.warn("Escort: GPS unavailable, sending without exact coords");
      } else {
        liveLocRef.current = firstCoords;
        setLocation(firstCoords);
      }

      setEscortLoading(false);
      setEscortActive(true);

      // AI Personalisation (AI-7)
      let customMsg = null;
      if (customContext.trim()) {
         try {
           customMsg = await personaliseSOSMessage(customContext, `${liveLocRef.current?.latitude}, ${liveLocRef.current?.longitude}`);
         } catch(e) {}
      }

      // Send SMS to contacts NOW — with accurate coords in hand
      if (sessionId) {
        const res = await sendEscortSOS(contacts, sessionId, liveLocRef.current, customMsg);
        if (res.success) {
          setTrackUrl(res.trackUrl);
        } else {
          // Fallback to plain location SMS if escort link fails
          await sendSOSAlert(contacts, "escort_start", liveLocRef.current, customMsg);
        }
      } else {
        await sendSOSAlert(contacts, "escort_start", liveLocRef.current, customMsg);
      }
    } catch (e) {
      setEscortLoading(false);
      Alert.alert("Error", e.message || "Could not start escort.");
    }
  };

  const endEscort = async () => {
    stopLocationWatch();
    await endLiveSession();
    setEscortActive(false);
    setTrackUrl(null);
    const res = await sendSOSAlert(contacts, "escort_end", liveLocRef.current);
    if (res.success) {
      Alert.alert("✅ Safe Check-in Sent", `${res.sent} contact${res.sent !== 1 ? "s" : ""} notified that you arrived safely.`);
    }
  };

  const addContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert("Required", "Please fill name and phone.");
      return;
    }
    const saved = await addContactToSupabase(newContact);
    if (!saved) Alert.alert("Error", "Could not save contact. Check your connection.");
    setNewContact({ name: "", phone: "", relation: "" });
    setAddModal(false);
  };

  const removeContact = (id) =>
    Alert.alert("Remove Contact", "Remove from your SafeCircle?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeContactFromSupabase(id) },
    ]);

  const submitReport = async () => {
    if (!selectedCat) { Alert.alert("Required", "Select a category."); return; }
    let area = reportArea;
    if (!area && location) area = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    if (!area) area = "Current location";

    // Get current coords for the Supabase record
    let lat = location?.latitude || null;
    let lng = location?.longitude || null;
    if (!lat) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          area = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch (_) { }
    }

    const optimistic = { id: Date.now().toString(), cat: selectedCat, area, time: "Just now", upvotes: 0 };
    // Optimistic local update
    saveReports([optimistic, ...reports]);

    // Write to Supabase community_reports (for the map + HomeScreen)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("community_reports").insert({
          user_id: user.id,
          category: selectedCat,
          note: area,
          lat,
          lng,
        });
      }
    } catch (e) {
      console.warn("Supabase report:", e.message);
    }

    setSelectedCat(null); setReportArea(""); setReportModal(false);
  };

  const upvote = id => saveReports(reports.map(x => x.id === id ? { ...x, upvotes: (x.upvotes || 0) + 1 } : x));

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header — notch-safe */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="shield-checkmark" size={20} color={PRIMARY} />
        <Text style={s.title}>SAFE CIRCLE</Text>
      </View>

      {/* SOS Hero */}
      <TouchableOpacity style={s.sosHeroBtn} onPress={triggerSOS}>
        <Ionicons name="warning" size={22} color="white" />
        <View style={{ flex: 1 }}>
          <Text style={s.sosHeroText}>Emergency SOS</Text>
          <Text style={s.sosHeroSub}>Send location to all contacts instantly</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Optional Context Field */}
      <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <Text style={s.aiContextLabel}>
           <Ionicons name="sparkles" size={12} color={PRIMARY} /> AI Personalised Message
        </Text>
        <TextInput
           style={s.contextInput}
           placeholder="e.g. Taking a cab (KA-01-HC-1234) from station"
           placeholderTextColor={SUBTEXT}
           value={customContext}
           onChangeText={setCustomContext}
           maxLength={100}
        />
        <Text style={s.aiContextHint}>If provided, AI will generate a custom distress SMS using this context.</Text>
      </View>

      {/* Escort Card */}
      <Animated.View style={[s.escortCard, escortActive && s.escortCardActive, escortActive && { transform: [{ scale: pulseAnim }] }]}>
        <View style={s.escortHeader}>
          <Ionicons name={escortActive ? "navigate" : "navigate-outline"} size={20} color={escortActive ? SUCCESS : PRIMARY} />
          <Text style={[s.escortTitle, escortActive && { color: SUCCESS }]}>Live Escort</Text>
          {escortActive && <View style={s.liveDot} />}
          {escortLoading && !escortActive && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" }}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={{ fontSize: 11, color: PRIMARY }}>Acquiring GPS...</Text>
            </View>
          )}
        </View>
        {escortActive ? (
          <>
            <Text style={s.escortSub}>
              {trackUrl ? "Contacts receiving live tracking link 🔴" : "Live tracking active"}
            </Text>
            <Text style={s.timer}>{fmt(escortTime)}</Text>
            {location && (
              <Text style={s.coords}>
                📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
            )}
            {trackUrl && (
              <View style={s.trackUrlBox}>
                <Ionicons name="link" size={12} color={SUCCESS} />
                <Text style={s.trackUrlText} numberOfLines={1}>{trackUrl}</Text>
              </View>
            )}
            <TouchableOpacity style={s.safeBtn} onPress={endEscort}>
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={s.safeBtnText}>I'm Safe — End Journey</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.escortSub}>Contacts get a real-time tracking link updating every second.</Text>
            <TouchableOpacity
              style={[s.startBtn, escortLoading && { opacity: 0.6 }]}
              onPress={startEscort}
              disabled={escortLoading}
            >
              {escortLoading
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="navigate" size={16} color="white" />}
              <Text style={s.startBtnText}>
                {escortLoading ? "Acquiring GPS lock..." : "Start Live Escort"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Contacts */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>My Circle ({contacts.length})</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="person-add" size={13} color={PRIMARY} />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {contacts.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="people-outline" size={28} color={SUBTEXT} />
            <Text style={s.emptyText}>No contacts added yet</Text>
          </View>
        ) : contacts.map(c => (
          <View key={c.id} style={s.contactRow}>
            <View style={[s.avatar, { backgroundColor: PRIMARY + "20" }]}>
              <Text style={s.avatarText}>{c.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactName}>{c.name}</Text>
              <Text style={s.contactMeta}>{c.phone}{c.relation ? ` · ${c.relation}` : ""}</Text>
            </View>
            <TouchableOpacity onPress={() => removeContact(c.id)} style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={SUBTEXT} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Community Alerts */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Community Alerts</Text>
          <TouchableOpacity style={[s.addBtn, { borderColor: "rgba(239,68,68,0.4)" }]} onPress={() => setReportModal(true)}>
            <Ionicons name="flag" size={13} color={DANGER} />
            <Text style={[s.addBtnText, { color: DANGER }]}>Report</Text>
          </TouchableOpacity>
        </View>
        {reports.length === 0 ? (
          <Text style={s.emptyText}>No alerts in your area</Text>
        ) : reports.map(r => (
          <View key={r.id} style={s.reportRow}>
            <Ionicons name={REPORT_CATEGORIES.find(c => c.label === r.cat)?.icon || "alert-circle-outline"} size={16} color={WARNING} />
            <View style={{ flex: 1 }}>
              <Text style={s.reportCat}>{r.cat}</Text>
              <Text style={s.reportArea}>{r.area} · {r.time}</Text>
            </View>
            <TouchableOpacity style={s.upvoteBtn} onPress={() => upvote(r.id)}>
              <Ionicons name="arrow-up" size={12} color={PRIMARY} />
              <Text style={s.upvoteText}>{r.upvotes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 6 }} onPress={() =>
              Alert.alert("Delete Alert", "Remove report?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => saveReports(reports.filter(x => x.id !== r.id)) },
              ])
            }>
              <Ionicons name="trash-outline" size={15} color={SUBTEXT} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={{ height: 50 }} />

      {/* Add Contact Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add to SafeCircle</Text>
            {[
              { key: "name", placeholder: "Full Name", icon: "person" },
              { key: "phone", placeholder: "Phone (with country code)", icon: "call" },
              { key: "relation", placeholder: "Relation (optional)", icon: "heart" },
            ].map(f => (
              <View key={f.key} style={s.modalInputRow}>
                <Ionicons name={f.icon} size={16} color={MUTED} />
                <TextInput
                  style={s.modalInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={MUTED}
                  value={newContact[f.key]}
                  onChangeText={v => setNewContact(n => ({ ...n, [f.key]: v }))}
                  keyboardType={f.key === "phone" ? "phone-pad" : "default"}
                />
              </View>
            ))}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={addContact}>
                <Text style={s.confirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Report Unsafe Area</Text>
            <Text style={s.modalSub}>Your report is anonymous</Text>
            <View style={s.catGrid}>
              {REPORT_CATEGORIES.map(c => (
                <TouchableOpacity key={c.label}
                  style={[s.catBtn, selectedCat === c.label && s.catBtnActive]}
                  onPress={() => setSelectedCat(c.label)}>
                  <Ionicons name={c.icon} size={14} color={selectedCat === c.label ? "white" : SUBTEXT} />
                  <Text style={[s.catBtnText, selectedCat === c.label && { color: "white" }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalInputRow}>
              <Ionicons name="location" size={16} color={MUTED} />
              <TextInput style={s.modalInput} placeholderTextColor={MUTED}
                placeholder="Area name (blank = auto-pin)" value={reportArea} onChangeText={setReportArea} />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setReportModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: DANGER }]} onPress={submitReport}>
                <Text style={s.confirmText}>Pin Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: TEXT, letterSpacing: 1.5 },
  sosHeroBtn: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, flexDirection: "row", gap: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  sosHeroText: { color: DANGER, fontSize: 16, fontWeight: "800" },
  sosHeroSub: { fontSize: 11, color: "rgba(239,68,68,0.7)", marginTop: 2 },
  escortCard: { backgroundColor: CARD, borderRadius: 18, padding: 18, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  escortCardActive: { borderColor: "rgba(34,197,94,0.35)", backgroundColor: "#061a0e" },
  escortHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  escortTitle: { fontSize: 15, fontWeight: "700", color: PRIMARY, flex: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SUCCESS },
  escortSub: { fontSize: 12, color: SUBTEXT, marginBottom: 14 },
  timer: { fontSize: 40, fontWeight: "900", color: SUCCESS, textAlign: "center", letterSpacing: 3, marginBottom: 4 },
  coords: { fontSize: 10, color: SUBTEXT, textAlign: "center", marginBottom: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  trackUrlBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.2)" },
  trackUrlText: { flex: 1, fontSize: 10, color: SUCCESS, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  safeBtn: { backgroundColor: SUCCESS, borderRadius: 14, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  safeBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  startBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  startBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: CARD, borderRadius: 18, padding: 18, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(139,92,246,0.35)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  addBtnText: { color: PRIMARY, fontSize: 12, fontWeight: "600" },
  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: SUBTEXT, fontStyle: "italic", textAlign: "center" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { color: PRIMARY, fontWeight: "700", fontSize: 15 },
  contactName: { fontSize: 14, fontWeight: "600", color: TEXT },
  contactMeta: { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  deleteBtn: { padding: 6 },
  reportRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  reportCat: { fontSize: 13, fontWeight: "600", color: TEXT },
  reportArea: { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  upvoteBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  upvoteText: { fontSize: 12, color: PRIMARY, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", paddingHorizontal: 16 },
  modalCard: { backgroundColor: CARD, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: BORDER },
  modalTitle: { fontSize: 18, fontWeight: "800", color: TEXT, marginBottom: 4 },
  modalSub: { fontSize: 12, color: SUBTEXT, marginBottom: 16 },
  modalInputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  modalInput: { flex: 1, fontSize: 14, color: TEXT },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.02)" },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catBtnText: { fontSize: 12, color: SUBTEXT },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  cancelText: { color: SUBTEXT, fontWeight: "600" },
  confirmBtn: { flex: 1, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmText: { color: "white", fontWeight: "700" },
  // AI-7
  aiContextLabel: { color: PRIMARY, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 },
  contextInput:   { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 13 },
  aiContextHint:  { color: SUBTEXT, fontSize: 10, marginTop: 4, marginHorizontal: 4 }
});
