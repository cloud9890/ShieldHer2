// screens/SafeCircleScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Animated, Modal, Platform
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendSOSAlert } from "../api/sos";

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";
const RED     = "#ef4444";
const GREEN   = "#22c55e";

const REPORT_CATEGORIES = [
  { label: "Poor Lighting",      icon: "bulb-outline" },
  { label: "Suspicious Person",  icon: "person-outline" },
  { label: "No Footpath",        icon: "warning-outline" },
  { label: "Harassment Spot",    icon: "alert-circle-outline" },
  { label: "Isolated Area",      icon: "moon-outline" },
  { label: "Unsafe Traffic",     icon: "car-outline" },
];

export default function SafeCircleScreen() {
  const [contacts, setContacts]         = useState([]);
  const [escortActive, setEscortActive] = useState(false);
  const [escortTime, setEscortTime]     = useState(0);
  const [reports, setReports]           = useState([]);
  const [addModal, setAddModal]         = useState(false);
  const [reportModal, setReportModal]   = useState(false);
  const [newContact, setNewContact]     = useState({ name: "", phone: "", relation: "" });
  const [selectedCat, setSelectedCat]   = useState(null);
  const [reportArea, setReportArea]     = useState("");
  const [location, setLocation]         = useState(null);
  const timerRef    = useRef(null);
  const watchRef    = useRef(null); // live location watcher during escort
  const liveLocRef  = useRef(null); // latest live coords
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  // Load persisted data
  useEffect(() => {
    const loadData = async () => {
      try {
        const c = await AsyncStorage.getItem("shieldher_contacts");
        if (c) setContacts(JSON.parse(c));
        const r = await AsyncStorage.getItem("shieldher_reports");
        if (r) setReports(JSON.parse(r));
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };
    loadData();
  }, []);

  const saveContacts = async (newContacts) => {
    setContacts(newContacts);
    await AsyncStorage.setItem("shieldher_contacts", JSON.stringify(newContacts));
  };

  const saveReports = async (newReports) => {
    setReports(newReports);
    await AsyncStorage.setItem("shieldher_reports", JSON.stringify(newReports));
  };

  // Cleanup on unmount — stop live watcher if still active
  useEffect(() => () => {
    watchRef.current?.remove();
    clearInterval(timerRef.current);
  }, []);

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

  const triggerSOS = async () => {
    if (contacts.length === 0) {
      Alert.alert("No Contacts", "Please add contacts to your SafeCircle to trigger an SOS.");
      return;
    }
    Alert.alert("🚨 Trigger Emergency SOS?", "This will immediately SMS your live location map link to all saved contacts.", [
      { text: "Cancel", style: "cancel" },
      { text: "SEND SOS", style: "destructive", onPress: async () => {
          Alert.alert("Processing", "Gathering live location and dispatching...");
          // Get fresh HIGH-accuracy GPS fix before sending
          let coords = liveLocRef.current || null;
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            coords = loc.coords;
            setLocation(coords);
          } catch {}
          const res = await sendSOSAlert(contacts, "sos", coords);
          if (res.success) Alert.alert("SOS Dispatched", `Sent to ${res.sent} contacts.`);
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Location access is required."); return; }
    try {
      // Get initial fix at HIGH accuracy
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      liveLocRef.current = loc.coords;
      setLocation(loc.coords);
      setEscortActive(true);

      // Send escort_start SMS with live coords
      const res = await sendSOSAlert(contacts, "escort_start", loc.coords);
      if (!res.success) Alert.alert("SMS Error", `Could not notify contacts: ${res.error || "Unknown error"}`);

      // Start watchPositionAsync — keeps tracking live location throughout escort
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
        (newLoc) => {
          liveLocRef.current = newLoc.coords;
          setLocation(newLoc.coords);
        }
      );
    } catch (e) {
      Alert.alert("Error", e.message || "Could not start escort.");
    }
  };

  const endEscort = async () => {
    // Stop live location watcher
    watchRef.current?.remove();
    watchRef.current = null;
    setEscortActive(false);
    // Send final check-in with the last known live coords
    const res = await sendSOSAlert(contacts, "escort_end", liveLocRef.current);
    if (res.success) {
      Alert.alert("Safe Check-in Sent", `Notified ${res.sent} contact${res.sent !== 1 ? "s" : ""} that you arrived safely.`);
    } else {
      Alert.alert("Check-in Error", res.error || "Could not notify contacts.");
    }
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) { Alert.alert("Required", "Please fill name and phone."); return; }
    const c = [...contacts, { ...newContact, id: Date.now().toString() }];
    saveContacts(c);
    setNewContact({ name: "", phone: "", relation: "" });
    setAddModal(false);
  };

  const removeContact = id => {
    const doRemove = () => saveContacts(contacts.filter(x => x.id !== id));
    if (Platform.OS === "web") {
      if (window.confirm("Remove this contact from your SafeCircle?")) doRemove();
    } else {
      Alert.alert("Remove Contact", "Remove from your SafeCircle?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  const submitReport = async () => {
    if (!selectedCat) { Alert.alert("Required", "Select a category."); return; }
    let area = reportArea;
    if (!area && location) area = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    if (!area) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          area = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
        } catch { area = "Pinned Location"; }
      } else area = "Unknown area";
    }
    const r = [{ id: Date.now().toString(), cat: selectedCat, area, time: "Just now", upvotes: 0 }, ...reports];
    saveReports(r);
    setSelectedCat(null); setReportArea(""); setReportModal(false);
  };

  const deleteReport = id => {
    const doDelete = () => saveReports(reports.filter(r => r.id !== id));
    if (Platform.OS === "web") {
      if (window.confirm("Delete this alert?")) doDelete();
    } else {
      Alert.alert("Delete Alert", "Remove this community report?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };
  
  const upvote = id => saveReports(reports.map(x => x.id === id ? { ...x, upvotes: x.upvotes + 1 } : x));

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>Safe Circle</Text>

      {/* Hero SOS Button */}
      <TouchableOpacity style={s.sosHeroBtn} onPress={triggerSOS}>
        <Ionicons name="warning" size={24} color="white" />
        <Text style={s.sosHeroText}>EMERGENCY SOS</Text>
      </TouchableOpacity>

      {/* Escort Card */}
      <Animated.View style={[s.escortCard, escortActive && s.escortCardActive, { transform: escortActive ? [{ scale: pulseAnim }] : [] }]}>
        <View style={s.escortHeader}>
          <Ionicons name={escortActive ? "navigate" : "navigate-outline"} size={20} color={escortActive ? GREEN : PRIMARY} />
          <Text style={[s.escortTitle, escortActive && { color: GREEN }]}>Live Escort</Text>
          {escortActive && <View style={s.liveDot} />}
        </View>
        {escortActive ? (
          <>
            <Text style={s.escortSub}>Live Map Tracking via SMS Active</Text>
            <Text style={s.timer}>{fmt(escortTime)}</Text>
            {location && <Text style={s.coords}>Tracking: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
            <TouchableOpacity style={s.safeBtn} onPress={endEscort}>
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={s.safeBtnText}>I'm Safe — End Journey</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.escortSub}>Share your live tracker map link with your circle until you arrive.</Text>
            <TouchableOpacity style={s.startBtn} onPress={startEscort}>
              <Text style={s.startBtnText}>Start Live Escort</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Contacts Box */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>My Circle ({contacts.length})</Text>
          <TouchableOpacity style={s.addContactBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="person-add" size={14} color={PRIMARY} />
            <Text style={s.addContactText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        {contacts.length === 0 ? (
           <Text style={s.emptyText}>You haven't added any contacts yet.</Text>
        ) : (
          contacts.map(c => (
            <TouchableOpacity key={c.id} style={s.contactRow} onLongPress={() => removeContact(c.id)}>
              <View style={s.avatar}><Text style={s.avatarText}>{c.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.contactName}>{c.name}</Text>
                <Text style={s.contactMeta}>{c.phone}{c.relation ? ` · ${c.relation}` : ""}</Text>
              </View>
              <TouchableOpacity onPress={() => removeContact(c.id)} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={16} color={SUBTEXT} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Community Reports */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Community Alerts</Text>
          <TouchableOpacity style={[s.addContactBtn, { borderColor: RED }]} onPress={() => setReportModal(true)}>
            <Ionicons name="flag" size={14} color={RED} />
            <Text style={[s.addContactText, { color: RED }]}>Report</Text>
          </TouchableOpacity>
        </View>
        
        {reports.length === 0 ? (
           <Text style={s.emptyText}>No alerts actively pinned in your area.</Text>
        ) : (
          reports.map(r => (
            <View key={r.id} style={s.reportRow}>
              <View style={s.reportLeft}>
                 <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                   {(() => {
                     const catIcon = REPORT_CATEGORIES.find(c => c.label === r.cat)?.icon || "alert-circle-outline";
                     return <Ionicons name={catIcon} size={14} color={TEXT} />;
                   })()}
                   <Text style={s.reportCat}>{r.cat}</Text>
                 </View>
                <Text style={s.reportArea}>{r.area}</Text>
                <Text style={s.reportTime}>{r.time}</Text>
              </View>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity style={s.upvoteBtn} onPress={() => upvote(r.id)}>
                  <Ionicons name="arrow-up" size={14} color={PRIMARY} />
                  <Text style={s.upvoteText}>{r.upvotes || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteReport(r.id)}>
                  <Ionicons name="trash-outline" size={18} color={SUBTEXT} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* Add Contact Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add to SafeCircle</Text>
            {[
              { key: "name",     placeholder: "Full Name",           icon: "person" },
              { key: "phone",    placeholder: "Phone Number (w/ code)",icon: "call"   },
              { key: "relation", placeholder: "Relation (optional)", icon: "heart"  },
            ].map(f => (
              <View key={f.key} style={s.modalInputRow}>
                <Ionicons name={f.icon} size={16} color="#6b7280" />
                <TextInput style={s.modalInput} placeholder={f.placeholder} placeholderTextColor="#6b7280" value={newContact[f.key]}
                  onChangeText={v => setNewContact(n => ({ ...n, [f.key]: v }))}
                  keyboardType={f.key === "phone" ? "phone-pad" : "default"} />
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
            <Text style={s.modalSub}>Your report is anonymous.</Text>
            <View style={s.catGrid}>
              {REPORT_CATEGORIES.map(c => (
                <TouchableOpacity key={c.label} style={[s.catBtn, selectedCat === c.label && s.catBtnActive]} onPress={() => setSelectedCat(c.label)}>
                  <Ionicons name={c.icon} size={16} color={selectedCat === c.label ? "white" : SUBTEXT} />
                  <Text style={[s.catBtnText, selectedCat === c.label && { color: "white" }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalInputRow}>
              <Ionicons name="location" size={16} color="#6b7280" />
              <TextInput style={s.modalInput} placeholderTextColor="#6b7280" placeholder="Area name (or blank to auto-pin)" value={reportArea} onChangeText={setReportArea} />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setReportModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: RED }]} onPress={submitReport}>
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
  container:        { flex: 1, backgroundColor: BG, padding: 16 },
  title:            { fontSize: 24, fontWeight: "800", color: TEXT, paddingTop: 40, marginBottom: 14 },
  sosHeroBtn:       { backgroundColor: RED, borderRadius: 16, paddingVertical: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, shadowColor: RED, shadowOpacity: 0.5, shadowRadius: 10, marginBottom: 16, elevation: 8 },
  sosHeroText:      { color: "white", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  escortCard:       { backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  escortCardActive: { borderColor: GREEN, backgroundColor: "#062612" }, // slightly green dark bg
  escortHeader:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  escortTitle:      { fontSize: 15, fontWeight: "700", color: PRIMARY },
  liveDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN, marginLeft: "auto" },
  escortSub:        { fontSize: 12, color: SUBTEXT, marginBottom: 12 },
  timer:            { fontSize: 36, fontWeight: "900", color: GREEN, textAlign: "center", letterSpacing: 2, marginBottom: 4 },
  coords:           { fontSize: 11, color: SUBTEXT, textAlign: "center", marginBottom: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  safeBtn:          { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  safeBtnText:      { color: "white", fontWeight: "700", fontSize: 14 },
  startBtn:         { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  startBtnText:     { color: "white", fontWeight: "700", fontSize: 14 },
  card:             { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  cardHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle:        { fontSize: 15, fontWeight: "700", color: TEXT },
  emptyText:        { fontSize: 13, color: SUBTEXT, fontStyle: "italic", textAlign: "center", paddingVertical: 20 },
  addContactBtn:    { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: PRIMARY, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  addContactText:   { color: PRIMARY, fontSize: 12, fontWeight: "600" },
  contactRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  avatar:           { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  avatarText:       { color: PRIMARY, fontWeight: "700", fontSize: 15 },
  contactName:      { fontSize: 14, fontWeight: "600", color: TEXT },
  contactMeta:      { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  reportRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", gap: 10 },
  reportLeft:       { flex: 1 },
  reportCat:        { fontSize: 13, fontWeight: "600", color: TEXT },
  reportArea:       { fontSize: 11, color: SUBTEXT, marginTop: 4 },
  reportTime:       { fontSize: 10, color: "#6b7280", marginTop: 2 },
  upvoteBtn:        { alignItems: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  upvoteText:       { fontSize: 13, color: PRIMARY, fontWeight: "700" },
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", paddingHorizontal: 16 },
  modalCard:        { backgroundColor: CARD, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: BORDER },
  modalTitle:       { fontSize: 18, fontWeight: "800", color: TEXT, marginBottom: 4 },
  modalSub:         { fontSize: 12, color: SUBTEXT, marginBottom: 16 },
  modalInputRow:    { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10 },
  modalInput:       { flex: 1, fontSize: 14, color: TEXT },
  catGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catBtn:           { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.02)" },
  catBtnActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catBtnText:       { fontSize: 12, color: SUBTEXT },
  modalBtns:        { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelBtn:        { flex: 1, borderWidth: 1, borderColor: SUBTEXT, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  cancelText:       { color: SUBTEXT, fontWeight: "600" },
  confirmBtn:       { flex: 1, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  confirmText:      { color: "white", fontWeight: "700" },
});
