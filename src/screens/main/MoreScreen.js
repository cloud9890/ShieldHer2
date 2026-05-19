// src/screens/MoreScreen.js
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import Hoverable from "../../components/common/Hoverable";

import { useNavigation } from "@react-navigation/native";
import { ChevronRight, CircleDashed, FileText, HelpCircle, LogOut, ShieldCheck } from "lucide-react-native";

import { supabase } from "../../api/supabase";
import { BG, CARD, BORDER, PRIMARY, PINK, TEXT, SUBTEXT, SUCCESS, WARNING, TEAL, DANGER } from "../../theme/colors";

const FEATURES = [
  {
    icon: "navigate",       label: "Safe Route",    subtitle: "Plan the safest path",
    color: PRIMARY, screen: "Route",
  },
  {
    icon: "sparkles",      label: "AI Shield",     subtitle: "AI-powered safety analysis",
    color: PINK, screen: "AI",
  },
  {
    icon: "book",          label: "Safety Laws",   subtitle: "Know your legal rights",
    color: SUCCESS, screen: "Laws",
  },
  {
    icon: "fitness",       label: "Self Defense",  subtitle: "Techniques & tips",
    color: WARNING, screen: "SelfDefense",
  },
  {
    icon: "person-circle", label: "My Profile",    subtitle: "Edit your account & settings",
    color: TEAL, screen: "Profile",
  },
];

export default function MoreScreen() {
  const navigation = useNavigation();

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <CircleDashed size={18} color={PRIMARY} />
        <Text style={s.title}>MORE FEATURES</Text>
      </View>

      <View style={s.grid}>
        {FEATURES.map(f => (
          <Hoverable key={f.label} style={s.card} onPress={() => navigation.navigate(f.screen)}  accessible={true} accessibilityRole="button" accessibilityLabel={`${f.label}, ${f.subtitle}`} accessibilityHint={`Opens ${f.label} screen`}>
            <View style={[s.iconBox, { backgroundColor: f.color + "18", borderColor: f.color + "30" }]}>
              <Ionicons name={f.icon} size={24} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>{f.label}</Text>
              <Text style={s.cardSub}>{f.subtitle}</Text>
            </View>
            <ChevronRight size={16} color={SUBTEXT} />
          </Hoverable>
        ))}
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>APP & SUPPORT</Text>
      </View>

      <View style={s.listContainer}>
        <Hoverable style={s.listItem} onPress={() => navigation.navigate("Support")} >
          <HelpCircle size={20} color={SUBTEXT} style={s.listIcon} />
          <Text style={s.listText}>Help & Support</Text>
          <ChevronRight size={16} color={SUBTEXT} />
        </Hoverable>
        
        <View style={s.listDivider} />

        <Hoverable style={s.listItem} onPress={() => navigation.navigate("Privacy")} >
          <ShieldCheck size={20} color={SUBTEXT} style={s.listIcon} />
          <Text style={s.listText}>Privacy Policy</Text>
          <ChevronRight size={16} color={SUBTEXT} />
        </Hoverable>

        <View style={s.listDivider} />

        <Hoverable style={s.listItem} onPress={() => navigation.navigate("Terms")} >
          <FileText size={20} color={SUBTEXT} style={s.listIcon} />
          <Text style={s.listText}>Terms of Service</Text>
          <ChevronRight size={16} color={SUBTEXT} />
        </Hoverable>
      </View>

      <Hoverable style={s.signOutBtn} onPress={signOut}>
        <LogOut size={18} color={DANGER} />
        <Text style={s.signOutText}>Sign Out</Text>
      </Hoverable>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  header:       { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  title:        { fontSize: 18, fontWeight: "800", color: "#f0f6fc", letterSpacing: 1.5 },
  grid:         { paddingHorizontal: 16, gap: 10 },
  card:         { backgroundColor: CARD, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: BORDER },
  iconBox:      { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cardLabel:    { fontSize: 15, fontWeight: "700", color: TEXT },
  cardSub:      { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  sectionHeader:{ paddingTop: 28, paddingHorizontal: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: SUBTEXT, letterSpacing: 1.2 },
  listContainer:{ backgroundColor: CARD, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  listItem:     { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
  listIcon:     { marginRight: 12 },
  listText:     { flex: 1, fontSize: 15, color: TEXT, fontWeight: "500" },
  listDivider:  { height: 1, backgroundColor: BORDER, marginLeft: 48 },
  signOutBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 24, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  signOutText:  { color: DANGER, fontWeight: "700", fontSize: 14 },
});
