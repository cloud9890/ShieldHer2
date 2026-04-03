// screens/MoreScreen.js
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BG     = "#0f0a1e";
const CARD   = "#1a1130";
const BORDER = "rgba(139,92,246,0.18)";
const TEXT   = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const ITEMS = [
  { label: "Safe Route",   sub: "AI-powered route safety analysis",   icon: "map",           color: "#8b5cf6", screen: "Route"       },
  { label: "AI Shield",    sub: "Harassment detection & safety chat",  icon: "sparkles",      color: "#ec4899", screen: "AI"          },
  { label: "Safety Laws",  sub: "Know your rights under Indian law",   icon: "library",       color: "#f59e0b", screen: "Laws"        },
  { label: "Self Defense", sub: "Video guides for self-protection",    icon: "fitness",       color: "#ef4444", screen: "SelfDefense" },
  { label: "My Profile",   sub: "Settings, preferences & quick dials", icon: "person-circle", color: "#34d399", screen: "Profile"     },
];

export default function MoreScreen({ navigation }) {
  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.title}>More</Text>
        <Text style={s.subtitle}>All ShieldHer features</Text>
      </View>

      <View style={s.list}>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={s.card}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[s.iconBox, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4b5563" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header:    { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title:     { fontSize: 28, fontWeight: "800", color: TEXT },
  subtitle:  { fontSize: 12, color: "#8b5cf6", marginTop: 4, fontWeight: "600" },
  list:      { paddingHorizontal: 16, gap: 10 },
  card:      { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER },
  iconBox:   { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardText:  { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: "700", color: TEXT },
  cardSub:   { fontSize: 12, color: SUBTEXT, marginTop: 2 },
});
