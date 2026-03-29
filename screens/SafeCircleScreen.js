// screens/SafeCircleScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Animated, Modal
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { sendSOSAlert } from "../services/sos";

const REPORT_CATEGORIES = [
  { label: "Poor Lighting",      icon: "💡" },
  { label: "Suspicious Person",  icon: "👤" },
  { label: "No Footpath",        icon: "🚧" },
  { label: "Harassment Spot",    icon: "⚠️" },
  { label: "Isolated Area",      icon: "🌑" },
  { label: "Unsafe Traffic",     icon: "🚗" },
];

const INITIAL_CONTACTS = [
  { id: "1", name: "Mom",         phone: "+91-98765-43210", relation: "Mother", status: "active" },
  { id: "2", name: "Sister Riya", phone: "+91-91234-56789", relation: "Sister", status: "active" },
  { id: "3", name: "Friend Neha", phone: "+91-87654-32109", relation: "Friend", status: "away"   },
];

const COMMUNITY_REPORTS = [
  { id: "1", cat: "Poor Lighting",     area: "MG Road, near Metro", time: "2h ago",  upvotes: 14 },
  { id: "2", cat: "Suspicious Person", area: "Sector 14 Park",      time: "5h ago",  upvotes: 8  },
  { id: "3", cat: "Harassment Spot",   area: "Bus Stand No. 3",     time: "1d ago",  upvotes: 22 },
];

export default function SafeCircleScreen() {
  const [contacts, setContacts]         = useState(INITIAL_CONTACTS);
  const [escortActive, setEscortActive] = useState(false);
  const [escortTime, setEscortTime]     = useState(0);
  const [checkedIn, setCheckedIn]       = useState(false);
  const [reports, setReports]           = useState(COMMUNITY_REPORTS);
  const [addModal, setAddModal]         = useState(false);
  const [reportModal, setReportModal]   = useState(false);
  const [newContact, setNewContact]     = useState({ name: "", phone: "", relation: "" });
  const [selectedCat, setSelectedCat]   = useState(null);
  const [reportArea, setReportArea]     = useState("");
  const [location, setLocation]         = useState(null);
  const timerRef  = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (escortActive) {
      timerRef.current = setInterval(() => setEscortTime(t => t + 1), 1000);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      clearInterval(timerRef.current);
      setEscortTime(0);
      pulseAnim.setValue(1);
    }
    return () => clearInterval(timerRef.current);
  }, [escortActive]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startEscort = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Location access is required for escort."); return; }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    setEscortActive(true);
    const activeContacts = contacts.filter(c => c.status === "active");
    sendSOSAlert(activeContacts, "escort_start").catch(e => console.warn("Escort start alert:", e));
  };

  const endEscort = async () => {
    setEscortActive(false);
    setCheckedIn(true);
    const activeContacts = contacts.filter(c => c.status === "active");
    sendSOSAlert(activeContacts, "checkin").catch(e => console.warn("Check-in alert:", e));
    Alert.alert("✅ Safe check-in sent!", `Notified ${activeContacts.length} contacts that you arrived safely.`);
    setTimeout(() => setCheckedIn(false), 5000);
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) { Alert.alert("Please fill name and phone."); return; }
    setContacts(c => [...c, { ...newContact, id: Date.now().toString(), status: "active" }]);
    setNewContact({ name: "", phone: "", relation: "" });
    setAddModal(false);
  };

  const removeContact = id => {
    Alert.alert("Remove Contact", "Remove from your SafeCircle?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setContacts(c => c.filter(x => x.id !== id)) },
    ]);
  };

  const submitReport = async () => {
    if (!selectedCat) { Alert.alert("Select a category."); return; }
    let area = reportArea;
    if (!area && location) area = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    if (!area) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        area = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
      } else area = "Unknown location";
    }
    setReports(r => [{ id: Date.now().toString(), cat: selectedCat, area, time: "Just now", upvotes: 0 }, ...r]);
    setSelectedCat(null); setReportArea(""); setReportModal(false);
    Alert.alert("✅ Report submitted", "Your community alert has been shared anonymously.");
  };

  const upvote = id => setReports(r => r.map(x => x.id === id ? { ...x, upvotes: x.upvotes + 1 } : x));

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>👥 SafeCircle</Text>

      <Animated.View style={[s.escortCard, escortActive && s.escortCardActive, { transform: escortActive ? [{ scale: pulseAnim }] : [] }]}>
        <View style={s.escortHeader}>
          <Ionicons name={escortActive ? "navigate" : "navigate-outline"} size={20} color={escortActive ? "#15803d" : "#9333ea"} />
          <Text style={[s.escortTitle, escortActive && { color: "#15803d" }]}>Virtual Escort</Text>
          {escortActive && <View style={s.liveDot} />}
        </View>
        {escortActive ? (
          <>
            <Text style={s.escortSub}>Live journey sharing — {contacts.filter(c => c.status === "active").length} contacts watching</Text>
            <Text style={s.timer}>{fmt(escortTime)}</Text>
            {location && <Text style={s.coords}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
            <TouchableOpacity style={s.safeBtn} onPress={endEscort}>
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={s.safeBtnText}>I'm Safe — End Journey</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.escortSub}>Share your live journey with your circle until you arrive safely.</Text>
            <TouchableOpacity style={s.startBtn} onPress={startEscort}>
              <Text style={s.startBtnText}>Start Virtual Escort</Text>
            </TouchableOpacity>
          </>
        )}
        {checkedIn && <Text style={s.checkinMsg}>✅ Safe check-in sent to your circle!</Text>}
      </Animated.View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>My Circle ({contacts.length})</Text>
          <TouchableOpacity style={s.addContactBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="person-add" size={14} color="#9333ea" />
            <Text style={s.addContactText}>Add</Text>
          </TouchableOpacity>
        </View>
        {contacts.map(c => (
          <TouchableOpacity key={c.id} style={s.contactRow} onLongPress={() => removeContact(c.id)}>
            <View style={s.avatar}><Text style={s.avatarText}>{c.name[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactName}>{c.name}</Text>
              <Text style={s.contactMeta}>{c.phone}{c.relation ? ` · ${c.relation}` : ""}</Text>
            </View>
            <View style={[s.statusDot, { backgroundColor: c.status === "active" ? "#4ade80" : "#d1d5db" }]} />
          </TouchableOpacity>
        ))}
        <Text style={s.hint}>Long-press a contact to remove</Text>
      </View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Community Alerts</Text>
          <TouchableOpacity style={s.addContactBtn} onPress={() => setReportModal(true)}>
            <Ionicons name="flag" size={14} color="#ef4444" />
            <Text style={[s.addContactText, { color: "#ef4444" }]}>Report</Text>
          </TouchableOpacity>
        </View>
        {reports.map(r => (
          <View key={r.id} style={s.reportRow}>
            <View style={s.reportLeft}>
              <Text style={s.reportCat}>{r.cat}</Text>
              <Text style={s.reportArea}>{r.area}</Text>
              <Text style={s.reportTime}>{r.time}</Text>
            </View>
            <TouchableOpacity style={s.upvoteBtn} onPress={() => upvote(r.id)}>
              <Ionicons name="arrow-up" size={14} color="#9333ea" />
              <Text style={s.upvoteText}>{r.upvotes}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />

      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add to SafeCircle</Text>
            {[
              { key: "name",     placeholder: "Full Name",           icon: "person" },
              { key: "phone",    placeholder: "Phone Number",        icon: "call"   },
              { key: "relation", placeholder: "Relation (optional)", icon: "heart"  },
            ].map(f => (
              <View key={f.key} style={s.modalInputRow}>
                <Ionicons name={f.icon} size={16} color="#9ca3af" />
                <TextInput style={s.modalInput} placeholder={f.placeholder} value={newContact[f.key]}
                  onChangeText={v => setNewContact(n => ({ ...n, [f.key]: v }))}
                  keyboardType={f.key === "phone" ? "phone-pad" : "default"} />
              </View>
            ))}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={addContact}>
                <Text style={s.confirmText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reportModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Report Unsafe Area</Text>
            <Text style={s.modalSub}>Reports are anonymous and help other women stay safe.</Text>
            <View style={s.catGrid}>
              {REPORT_CATEGORIES.map(c => (
                <TouchableOpacity key={c.label} style={[s.catBtn, selectedCat === c.label && s.catBtnActive]} onPress={() => setSelectedCat(c.label)}>
                  <Text>{c.icon}</Text>
                  <Text style={[s.catBtnText, selectedCat === c.label && { color: "white" }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalInputRow}>
              <Ionicons name="location" size={16} color="#9ca3af" />
              <TextInput style={s.modalInput} placeholder="Area name (or auto-detect)" value={reportArea} onChangeText={setReportArea} />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setReportModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: "#ef4444" }]} onPress={submitReport}>
                <Text style={s.confirmText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  title:            { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 14 },
  escortCard:       { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 14, elevation: 3, borderWidth: 2, borderColor: "#e9d5ff" },
  escortCardActive: { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
  escortHeader:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  escortTitle:      { fontSize: 15, fontWeight: "700", color: "#9333ea" },
  liveDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e", marginLeft: "auto" },
  escortSub:        { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  timer:            { fontSize: 36, fontWeight: "900", color: "#15803d", textAlign: "center", letterSpacing: 2, marginBottom: 4 },
  coords:           { fontSize: 11, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  safeBtn:          { backgroundColor: "#22c55e", borderRadius: 14, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  safeBtnText:      { color: "white", fontWeight: "700", fontSize: 14 },
  startBtn:         { backgroundColor: "#9333ea", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  startBtnText:     { color: "white", fontWeight: "700", fontSize: 14 },
  checkinMsg:       { color: "#15803d", fontSize: 12, textAlign: "center", marginTop: 8 },
  card:             { backgroundColor: "white", borderRadius: 16, padding: 16, elevation: 2, marginBottom: 14 },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle:        { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  addContactBtn:    { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#d8b4fe", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  addContactText:   { color: "#9333ea", fontSize: 12, fontWeight: "600" },
  contactRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  avatar:           { width: 38, height: 38, borderRadius: 19, backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" },
  avatarText:       { color: "#7c3aed", fontWeight: "700", fontSize: 15 },
  contactName:      { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  contactMeta:      { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  statusDot:        { width: 9, height: 9, borderRadius: 5 },
  hint:             { fontSize: 10, color: "#d1d5db", textAlign: "center", marginTop: 8 },
  reportRow:        { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb", gap: 10 },
  reportLeft:       { flex: 1 },
  reportCat:        { fontSize: 13, fontWeight: "600", color: "#374151" },
  reportArea:       { fontSize: 11, color: "#6b7280", marginTop: 2 },
  reportTime:       { fontSize: 10, color: "#9ca3af", marginTop: 1 },
  upvoteBtn:        { alignItems: "center", gap: 2, borderWidth: 1, borderColor: "#e9d5ff", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  upvoteText:       { fontSize: 12, color: "#9333ea", fontWeight: "700" },
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard:        { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:       { fontSize: 17, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
  modalSub:         { fontSize: 12, color: "#9ca3af", marginBottom: 14 },
  modalInputRow:    { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  modalInput:       { flex: 1, fontSize: 14, color: "#374151" },
  catGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  catBtn:           { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  catBtnActive:     { backgroundColor: "#9333ea", borderColor: "#9333ea" },
  catBtnText:       { fontSize: 12, color: "#374151" },
  modalBtns:        { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  cancelText:       { color: "#6b7280", fontWeight: "600" },
  confirmBtn:       { flex: 1, backgroundColor: "#9333ea", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmText:      { color: "white", fontWeight: "700" },
});
