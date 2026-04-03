// screens/SafetyLawsScreen.js — Premium Obsidian Redesign
import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Linking, Alert, Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";
const PINK    = "#ec4899";

const LAWS = [
  {
    id: "5",
    category: "Emergency & Helpline",
    icon: "call",
    color: "#34d399",
    laws: [
      { section: "100",  title: "Police Emergency", desc: "Universal police emergency response.", action: "tel:100" },
      { section: "181",  title: "Women Helpline", desc: "Abhayam - 24/7 National Women help.", action: "tel:181" },
      { section: "1091", title: "Women Response", desc: "Dedicated police wing for women safety.", action: "tel:1091" },
      { section: "112",  title: "National Emergency", desc: "Integrated police, fire, & medical.", action: "tel:112" },
    ],
  },
  {
    id: "1",
    category: "Harassment & Assault",
    icon: "shield",
    color: "#f87171",
    laws: [
      { section: "IPC § 354", title: "Outraging Modesty", desc: "Assault or criminal force to a woman with intent to outrage modesty (1-5 years jail).", action: "FIR required at nearest station." },
      { section: "IPC § 354A", title: "Sexual Harassment", desc: "Physical contact, demands for favors, or showing pornography (Up to 3 years jail).", action: "Complaint via FIR or POSH committee." },
      { section: "IPC § 354C", title: "Voyeurism", desc: "Capturing images of woman in private acts without consent (1-7 years jail).", action: "Retain digital evidence for FIR." },
    ],
  },
  {
    id: "3",
    category: "Cyber Crimes",
    icon: "laptop",
    color: "#06b6d4",
    laws: [
      { section: "IT Act § 66E", title: "Privacy Violation", desc: "Intentionally capturing/publishing private images without consent.", action: "Report to cybercrime.gov.in" },
      { section: "IT Act § 67A", title: "Obscene Content", desc: "Transmitting sexually explicit material electronically (3-7 years jail).", action: "Save screenshots; report to Cyber Cell." },
    ],
  },
  {
    id: "2",
    category: "Workplace (POSH)",
    icon: "briefcase",
    color: "#f59e0b",
    laws: [
      { section: "POSH Act", title: "Workplace Safety", desc: "Organizations of 10+ must have Internal Complaints Committee (ICC).", action: "File complaint with company ICC." },
    ],
  },
];

export default function SafetyLawsScreen() {
  const [expanded, setExpanded] = useState({ "5": true });
  const [search,   setSearch]   = useState("");

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAction = (action) => {
    if (action.startsWith("tel:")) Linking.openURL(action);
    else Alert.alert("Legal Action", action);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#12082a", BG]} style={s.headerRibbon}>
        <Text style={a.badge}>LEGAL ACCESS</Text>
        <Text style={a.title}>Safety Laws</Text>
        <Text style={s.sub}>Know your rights in India (IPC / BNS)</Text>
      </LinearGradient>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={PRIMARY} />
          <TextInput
            style={s.searchInput}
            placeholder="Search Sections (e.g. 354)..."
            placeholderTextColor="#4b5563"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Laws Accordion */}
        {LAWS.map(cat => (
          <View key={cat.id} style={s.catBlock}>
            <TouchableOpacity style={s.catHeader} onPress={() => toggle(cat.id)} activeOpacity={0.8}>
              <View style={[s.catIcon, { backgroundColor: cat.color + "15" }]}>
                <Ionicons name={cat.icon} size={20} color={cat.color} />
              </View>
              <Text style={s.catTitle}>{cat.category}</Text>
              <Ionicons name={expanded[cat.id] ? "chevron-up" : "chevron-down"} size={16} color={SUBTEXT} />
            </TouchableOpacity>

            {expanded[cat.id] && (
              <View style={s.catContent}>
                {cat.laws.map((law, i) => (
                  <View key={i} style={s.lawCard}>
                    <View style={s.lawRow}>
                      <View style={[s.secPill, { borderColor: cat.color + "40" }]}>
                        <Text style={[s.secText, { color: cat.color }]}>{law.section}</Text>
                      </View>
                      <TouchableOpacity style={s.actionBtn} onPress={() => handleAction(law.action)}>
                         <Ionicons name={law.action.startsWith("tel:") ? "call" : "information-circle"} size={16} color={law.action.startsWith("tel:") ? "#34d399" : PINK} />
                      </TouchableOpacity>
                    </View>
                    <Text style={s.lawTitle}>{law.title}</Text>
                    <Text style={s.lawDesc}>{law.desc}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer info */}
        <View style={s.disclaimer}>
          <Ionicons name="alert-circle" size={14} color="#6b7280" />
          <Text style={s.disclaimerText}>Laws are for informational purposes. For legal disputes, consult a registered advocate.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const a = {
  badge: { color: PRIMARY, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 2 },
  title: { color: TEXT, fontSize: 26, fontWeight: "900" },
};

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },
  headerRibbon:   { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  sub:            { color: SUBTEXT, fontSize: 13, fontWeight: "600", marginTop: 4 },
  content:        { flex: 1, paddingHorizontal: 16 },
  
  searchBar:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 20, elevation: 2 },
  searchInput:    { flex: 1, color: TEXT, fontSize: 14, fontWeight: "600" },

  catBlock:       { backgroundColor: CARD, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  catHeader:      { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  catIcon:        { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catTitle:       { flex: 1, color: TEXT, fontSize: 15, fontWeight: "800" },

  catContent:     { padding: 10, paddingTop: 0, gap: 10 },
  lawCard:        { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 18, borderDash: [1,1], padding: 16, gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  lawRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  secPill:        { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  secText:        { fontSize: 11, fontWeight: "900" },
  actionBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
  lawTitle:       { color: TEXT, fontSize: 14, fontWeight: "700" },
  lawDesc:        { color: SUBTEXT, fontSize: 12, lineHeight: 18 },

  disclaimer:     { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 24, paddingHorizontal: 10 },
  disclaimerText: { flex: 1, color: "#6b7280", fontSize: 11, fontStyle: "italic" },
});
