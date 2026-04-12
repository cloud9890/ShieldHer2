// screens/SafetyLawsScreen.js
import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Linking, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BG_DEEP as BG, CARD_DEEP as CARD, BORDER_VIOLET as BORDER, PRIMARY, TEXT, SUBTEXT } from "../theme/colors";

const LAWS = [
  {
    id: "1",
    category: "Physical & Sexual Harassment",
    icon: "shield-outline",
    color: "#ef4444",
    laws: [
      { section: "IPC § 354", title: "Assault on Woman's Modesty", desc: "Assault or criminal force to a woman intending to outrage her modesty. Punishment: 1–5 years imprisonment + fine.", action: "File FIR at any police station or use e-FIR." },
      { section: "IPC § 354A", title: "Sexual Harassment", desc: "Physical contact, demand for sexual favors, showing pornography against will. Punishment: up to 3 years + fine.", action: "Complaint to police, ICC at workplace, or NCW." },
      { section: "IPC § 354C", title: "Voyeurism", desc: "Watching/capturing images of woman in private act without consent. Punishment: 1–3 years (first offence), 3–7 years (repeat).", action: "File FIR immediately; preserve digital evidence." },
      { section: "IPC § 354D", title: "Stalking", desc: "Following, contacting, monitoring a woman despite her disinterest. Punishment: 1–3 years + fine.", action: "File FIR; request restraining order from court." },
      { section: "IPC § 376", title: "Rape", desc: "Sexual assault without consent. Punishment: minimum 10 years rigorous imprisonment, may extend to life.", action: "Contact police (100), hospital for medical evidence, or rape crisis center." },
    ],
  },
  {
    id: "2",
    category: "Workplace Harassment (POSH Act 2013)",
    icon: "business-outline",
    color: "#f59e0b",
    laws: [
      { section: "POSH Act", title: "Sexual Harassment at Workplace", desc: "Covers all workplaces. Every organization of 10+ employees must have an Internal Complaints Committee (ICC). Complaint must be filed within 3 months of incident.", action: "File written complaint with ICC. If no ICC, approach Local Complaints Committee at district level." },
      { section: "POSH § 14", title: "False Complaint Protection", desc: "Protection for complainants from retaliation. Employer cannot take adverse action against complainant during inquiry.", action: "Report retaliation to ICC or Labour Commissioner." },
      { section: "POSH § 19", title: "Employer Duties", desc: "Employers must display penal consequences of sexual harassment, organize awareness programs, and assist women in filing complaints.", action: "If employer fails duties, file complaint with District Officer." },
    ],
  },
  {
    id: "3",
    category: "Cyber Harassment & Privacy",
    icon: "phone-portrait-outline",
    color: "#06b6d4",
    laws: [
      { section: "IT Act § 66E", title: "Privacy Violation", desc: "Publishing private images of a person without consent. Punishment: up to 3 years + ₹2 lakh fine.", action: "File cybercrime complaint at cybercrime.gov.in or nearest cybercrime cell." },
      { section: "IT Act § 67A", title: "Obscene Material Online", desc: "Publishing or transmitting sexually explicit material. Punishment: 3–7 years + fine.", action: "Report to National Cyber Crime Reporting Portal (cybercrime.gov.in)." },
      { section: "BNS § 294", title: "Online Stalking/Harassment", desc: "Updated law under Bharatiya Nyaya Sanhita 2023 covering online harassment, threats, and morphed images.", action: "File cybercrime complaint; provide screenshots as evidence." },
    ],
  },
  {
    id: "4",
    category: "Domestic Violence",
    icon: "home-outline",
    color: "#ec4899",
    laws: [
      { section: "PWDVA 2005", title: "Protection of Women from Domestic Violence", desc: "Covers physical, sexual, emotional, verbal, and economic abuse by any family member. Victim can seek protection order, residence order, and monetary relief.", action: "Contact Protection Officer in your district or call 181." },
      { section: "IPC § 498A", title: "Cruelty by Husband/Relatives", desc: "Husband or relatives harassing wife for dowry or causing grave injury. Punishment: up to 3 years + fine.", action: "File FIR at police station. Police must register within 24 hours." },
    ],
  },
  {
    id: "5",
    category: "Emergency Helplines",
    icon: "call-outline",
    color: "#34d399",
    laws: [
      { section: "100",  title: "Police Emergency",       desc: "24×7 police emergency response.", action: "tel:100"  },
      { section: "181",  title: "Women Helpline",         desc: "24×7 women in distress helpline.", action: "tel:181"  },
      { section: "112",  title: "National Emergency",     desc: "Integrated emergency number for police, fire, ambulance.", action: "tel:112"  },
      { section: "1091", title: "Women Distress Helpline",desc: "Police helpline specifically for women.", action: "tel:1091" },
      { section: "7827-170-170", title: "NCW Helpline",   desc: "National Commission for Women helpline.", action: "tel:7827170170" },
      { section: "1800-11-0001", title: "iCall Counselling", desc: "Free tele-counselling for psychological support.", action: "tel:18001100001" },
    ],
  },
];

export default function SafetyLawsScreen() {
  const [expanded, setExpanded] = useState({ "5": true });
  const [search,   setSearch]   = useState("");

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = search.trim()
    ? LAWS.map(cat => ({
        ...cat,
        laws: cat.laws.filter(l =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.section.toLowerCase().includes(search.toLowerCase()) ||
          l.desc.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.laws.length > 0)
    : LAWS;

  const handleAction = (action, isHelpline) => {
    if (action.startsWith("tel:")) {
      Linking.openURL(action);
    } else {
      Alert.alert("How to File", action, [{ text: "OK" }]);
    }
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Women Safety Laws</Text>
        <Text style={s.subtitle}>Know your rights. Stay empowered.</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={SUBTEXT} />
        <TextInput
          style={s.searchInput}
          placeholder="Search laws, sections…"
          placeholderTextColor="#4b5563"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#4b5563" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Categories */}
      {filtered.map(cat => (
        <View key={cat.id} style={s.catCard}>
          <TouchableOpacity style={s.catHeader} onPress={() => toggle(cat.id)} activeOpacity={0.8}>
            <View style={[s.catIcon, { backgroundColor: cat.color + "18" }]}>
              <Ionicons name={cat.icon} size={18} color={cat.color} />
            </View>
            <Text style={[s.catTitle, { color: cat.color }]}>{cat.category}</Text>
            <View style={s.catCountBadge}>
              <Text style={s.catCount}>{cat.laws.length}</Text>
            </View>
            <Ionicons name={expanded[cat.id] ? "chevron-up" : "chevron-down"} size={16} color={SUBTEXT} />
          </TouchableOpacity>

          {expanded[cat.id] && cat.laws.map((law, i) => (
            <View key={i} style={[s.lawItem, i < cat.laws.length - 1 && s.lawBorder]}>
              <View style={s.lawTopRow}>
                <View style={[s.sectionBadge, { backgroundColor: cat.color + "15", borderColor: cat.color + "35" }]}>
                  <Text style={[s.sectionText, { color: cat.color }]}>{law.section}</Text>
                </View>
              </View>
              <Text style={s.lawTitle}>{law.title}</Text>
              <Text style={s.lawDesc}>{law.desc}</Text>
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: cat.color + "40", backgroundColor: cat.color + "10" }]}
                onPress={() => handleAction(law.action, cat.id === "5")}
              >
                <Ionicons
                  name={law.action.startsWith("tel:") ? "call" : "arrow-forward-circle"}
                  size={14} color={cat.color}
                />
                <Text style={[s.actionBtnText, { color: cat.color }]}>
                  {law.action.startsWith("tel:") ? `Call ${law.section}` : "How to file complaint"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Ionicons name="information-circle-outline" size={14} color="#4b5563" />
        <Text style={s.disclaimerText}>
          Information is for general awareness. For legal advice, consult a qualified lawyer or contact the National Commission for Women (NCW).
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BG },
  header:         { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title:          { fontSize: 24, fontWeight: "800", color: TEXT },
  subtitle:       { fontSize: 12, color: PRIMARY, marginTop: 4, fontWeight: "600" },
  searchRow:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  searchInput:    { flex: 1, fontSize: 14, color: TEXT },
  catCard:        { backgroundColor: CARD, borderRadius: 20, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  catHeader:      { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  catIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catTitle:       { flex: 1, fontSize: 13, fontWeight: "700" },
  catCountBadge:  { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  catCount:       { color: SUBTEXT, fontSize: 11, fontWeight: "600" },
  lawItem:        { padding: 14, paddingTop: 12, gap: 6 },
  lawBorder:      { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  lawTopRow:      { flexDirection: "row" },
  sectionBadge:   { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  sectionText:    { fontSize: 11, fontWeight: "700" },
  lawTitle:       { fontSize: 14, fontWeight: "700", color: TEXT },
  lawDesc:        { fontSize: 12, color: SUBTEXT, lineHeight: 18 },
  actionBtn:      { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start", marginTop: 2 },
  actionBtnText:  { fontSize: 12, fontWeight: "600" },
  disclaimer:     { flexDirection: "row", gap: 8, alignItems: "flex-start", marginHorizontal: 16, marginTop: 4, padding: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  disclaimerText: { flex: 1, fontSize: 11, color: "#4b5563", lineHeight: 16 },
});
