// screens/SelfDefenseScreen.js — Premium Obsidian Redesign
import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Linking, Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";
const GREEN   = "#34d399";
const AMBER   = "#f97316";

const VIDEOS = [
  { id: "v1", title: "5 Essential Moves", cat: "Basics", dur: "8m", level: "Beginner", color: PRIMARY, icon: "body", query: "self defense moves for women basics" },
  { id: "v2", title: "Escape a Wrist Grab", cat: "Escapes", dur: "5m", level: "Beginner", color: PINK, icon: "hand-right", query: "how to escape wrist grab women" },
  { id: "v3", title: "Rear Bear Hug", cat: "Escapes", dur: "7m", level: "Beginner", color: AMBER, icon: "resize", query: "bear hug escape women self defense" },
  { id: "v4", title: "Street Harassment Tips", cat: "Awareness", dur: "12m", level: "Beginner", color: "#06b6d4", icon: "walk", query: "handling street harassment women" },
  { id: "v5", title: "Elbow & Palm Strikes", cat: "Striking", dur: "6m", level: "Pro", color: "#ef4444", icon: "fitness", query: "elbow and palm strikes women training" },
];

const CATEGORIES = ["All", "Basics", "Escapes", "Striking", "Awareness"];

export default function SelfDefenseScreen() {
  const [activeCat, setActiveCat] = useState("All");

  const filtered = activeCat === "All" ? VIDEOS : VIDEOS.filter(v => v.cat === activeCat);

  const openVideo = (q) => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);

  return (
    <View style={s.root}>
      <LinearGradient colors={["#12082a", BG]} style={s.headerRibbon}>
        <Text style={a.badge}>SKILL TRAINING</Text>
        <Text style={a.title}>Self Defense</Text>
        <Text style={s.sub}>Visual tutorials to stay prepared</Text>
      </LinearGradient>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContentStyle}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[s.catChip, activeCat === c && s.catChipActive]} onPress={() => setActiveCat(c)}>
              <Text style={[s.catChipText, activeCat === c && { color: "white" }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Video Cards Grid */}
        <View style={s.grid}>
          {filtered.map(v => (
            <TouchableOpacity key={v.id} style={s.vCard} onPress={() => openVideo(v.query)} activeOpacity={0.9}>
              <View style={[s.vPreview, { backgroundColor: v.color + "15" }]}>
                <View style={s.vIconBg}>
                  <Ionicons name={v.icon} size={32} color={v.color} />
                </View>
                <View style={s.playBtn}>
                  <Ionicons name="play" size={20} color="white" />
                </View>
                <View style={s.durPill}><Text style={s.durText}>{v.dur}</Text></View>
              </View>

              <View style={s.vInfo}>
                <View style={s.vTagRow}>
                  <View style={[s.levelPill, { borderColor: v.level === "Pro" ? AMBER + "40" : GREEN + "40" }]}>
                    <Text style={[s.levelText, { color: v.level === "Pro" ? AMBER : GREEN }]}>{v.level.toUpperCase()}</Text>
                  </View>
                  <Text style={s.vCatName}>{v.cat}</Text>
                </View>
                <Text style={s.vTitle} numberOfLines={1}>{v.title}</Text>
                <View style={s.ytRow}>
                   <Ionicons name="logo-youtube" size={14} color="#ef4444" />
                   <Text style={s.ytText}>Open Tutorial</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Practice Banner */}
        <View style={s.practiceBox}>
          <Ionicons name="fitness-outline" size={24} color={PRIMARY} />
          <View style={{ flex: 1 }}>
            <Text style={s.pTitle}>Daily Practice</Text>
            <Text style={s.pDesc}>Try practicing these moves for 10 minutes every morning to build muscle memory.</Text>
          </View>
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
  root:              { flex: 1, backgroundColor: BG },
  headerRibbon:      { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  sub:               { color: SUBTEXT, fontSize: 13, fontWeight: "600", marginTop: 4 },
  content:           { flex: 1 },

  catScroll:         { marginBottom: 20 },
  catContentStyle:   { paddingHorizontal: 16, gap: 10 },
  catChip:           { backgroundColor: CARD, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  catChipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catChipText:       { color: SUBTEXT, fontSize: 12, fontWeight: "700" },

  grid:              { paddingHorizontal: 16, gap: 14 },
  vCard:             { backgroundColor: CARD, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: BORDER, elevation: 4 },
  vPreview:          { height: 130, alignItems: "center", justifyContent: "center", position: "relative" },
  vIconBg:           { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
  playBtn:           { position: "absolute", width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(139,92,246,0.8)", alignItems: "center", justifyContent: "center", top: "50%", marginTop: -22 },
  durPill:           { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  durText:           { color: "white", fontSize: 10, fontWeight: "800" },

  vInfo:             { padding: 16, gap: 6 },
  vTagRow:           { flexDirection: "row", alignItems: "center", gap: 10 },
  levelPill:         { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  levelText:         { fontSize: 9, fontWeight: "900" },
  vCatName:          { color: SUBTEXT, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  vTitle:            { color: TEXT, fontSize: 16, fontWeight: "800" },
  ytRow:             { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  ytText:            { color: "#f87171", fontSize: 12, fontWeight: "800" },

  practiceBox:       { margin: 16, marginTop: 32, backgroundColor: "rgba(139,92,246,0.1)", borderRadius: 20, padding: 18, flexDirection: "row", gap: 16, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  pTitle:            { color: TEXT, fontSize: 15, fontWeight: "800" },
  pDesc:             { color: SUBTEXT, fontSize: 12, lineHeight: 18, marginTop: 2 },
});
