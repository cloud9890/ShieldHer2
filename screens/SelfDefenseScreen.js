// screens/SelfDefenseScreen.js
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

// Curated self-defense video topics with YouTube search queries
const VIDEOS = [
  {
    id: "v1",
    title: "5 Basic Self-Defense Moves",
    category: "Basics",
    duration: "~8 min",
    level: "Beginner",
    color: "#8b5cf6",
    icon: "body-outline",
    desc: "Essential techniques every woman should know — wrist escapes, palm strikes, and breaking free from grabs.",
    query: "5 basic self defense moves for women beginners",
  },
  {
    id: "v2",
    title: "Escape a Wrist Grab",
    category: "Escapes",
    duration: "~5 min",
    level: "Beginner",
    color: "#ec4899",
    icon: "hand-left-outline",
    desc: "Step-by-step techniques to break free when someone grabs your wrist from any direction.",
    query: "how to escape wrist grab self defense women",
  },
  {
    id: "v3",
    title: "Bear Hug Escape",
    category: "Escapes",
    duration: "~6 min",
    level: "Beginner",
    color: "#f59e0b",
    icon: "resize-outline",
    desc: "Effectively escape when someone grabs you from behind — arms pinned or free.",
    query: "bear hug escape self defense women krav maga",
  },
  {
    id: "v4",
    title: "Street Harassment Response",
    category: "Awareness",
    duration: "~10 min",
    level: "Beginner",
    color: "#06b6d4",
    icon: "walk-outline",
    desc: "How to assertively respond to verbal harassment in public, de-escalation, and when to act.",
    query: "how to handle street harassment women safety tips",
  },
  {
    id: "v5",
    title: "Situational Awareness",
    category: "Awareness",
    duration: "~12 min",
    level: "Beginner",
    color: "#34d399",
    icon: "eye-outline",
    desc: "Cooper's Color Code for threat awareness — how to stay alert without anxiety.",
    query: "situational awareness personal safety women",
  },
  {
    id: "v6",
    title: "Elbow & Palm Strikes",
    category: "Striking",
    duration: "~7 min",
    level: "Intermediate",
    color: "#ef4444",
    icon: "fitness-outline",
    desc: "High-power strikes to vulnerable zones — effective even without prior training.",
    query: "elbow palm strike self defense women training",
  },
  {
    id: "v7",
    title: "Choke Hold Escape",
    category: "Escapes",
    duration: "~8 min",
    level: "Intermediate",
    color: "#a78bfa",
    icon: "shield-outline",
    desc: "Both front and rear choke escapes using body mechanics, not just strength.",
    query: "choke hold escape self defense women step by step",
  },
  {
    id: "v8",
    title: "Using Everyday Objects",
    category: "Tools",
    duration: "~9 min",
    level: "All levels",
    color: "#f97316",
    icon: "key-outline",
    desc: "Keys, bags, umbrellas as defensive tools — legal, always available, effective.",
    query: "self defense using everyday objects women keys bag",
  },
];

const CATEGORIES = ["All", "Basics", "Escapes", "Striking", "Awareness", "Tools"];

const LEVEL_COLOR = {
  "Beginner":     "#34d399",
  "Intermediate": "#fbbf24",
  "All levels":   "#a78bfa",
};

export default function SelfDefenseScreen() {
  const [activeCategory, setActiveCategory] = require("react").useState("All");

  const filtered = activeCategory === "All"
    ? VIDEOS
    : VIDEOS.filter(v => v.category === activeCategory);

  const openVideo = (query) => {
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Self Defense</Text>
        <Text style={s.subtitle}>Watch, learn, stay prepared</Text>
      </View>

      {/* Safety tip banner */}
      <View style={s.tipBanner}>
        <Ionicons name="bulb-outline" size={20} color="#a78bfa" />
        <Text style={s.tipText}>
          Practice these techniques regularly. Muscle memory formed in safety could save your life in danger.
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catScrollContent}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.catChip, activeCategory === cat && s.catChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[s.catChipText, activeCategory === cat && { color: "white" }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Videos */}
      <View style={s.grid}>
        {filtered.map(video => (
          <TouchableOpacity key={video.id} style={s.videoCard} onPress={() => openVideo(video.query)} activeOpacity={0.85}>
            {/* Thumbnail area */}
            <View style={[s.thumbnail, { backgroundColor: video.color + "18" }]}>
              <View style={{ alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: video.color + "22" }}>
                <Ionicons name={video.icon} size={34} color={video.color} />
              </View>
              <View style={s.playBtn}>
                <Ionicons name="play-circle" size={28} color="white" />
              </View>
              <View style={s.thumbnailOverlay} />
              {/* Duration */}
              <View style={s.durationBadge}>
                <Text style={s.durationText}>{video.duration}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={s.videoInfo}>
              <View style={s.videoTopRow}>
                <View style={[s.levelBadge, { backgroundColor: LEVEL_COLOR[video.level] + "18", borderColor: LEVEL_COLOR[video.level] + "35" }]}>
                  <Text style={[s.levelText, { color: LEVEL_COLOR[video.level] }]}>{video.level}</Text>
                </View>
                <View style={[s.catBadge, { backgroundColor: video.color + "15" }]}>
                  <Text style={[s.catBadgeText, { color: video.color }]}>{video.category}</Text>
                </View>
              </View>
              <Text style={s.videoTitle}>{video.title}</Text>
              <Text style={s.videoDesc} numberOfLines={2}>{video.desc}</Text>
              <View style={s.watchRow}>
                <Ionicons name="logo-youtube" size={14} color="#ef4444" />
                <Text style={s.watchText}>Watch on YouTube</Text>
                <Ionicons name="open-outline" size={12} color="#4b5563" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Ionicons name="information-circle-outline" size={14} color="#4b5563" />
        <Text style={s.disclaimerText}>
          These videos open YouTube searches. Content accuracy depends on the video creator. Practice with a certified instructor for best results.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BG },
  header:           { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  title:            { fontSize: 24, fontWeight: "800", color: TEXT },
  subtitle:         { fontSize: 12, color: PRIMARY, marginTop: 4, fontWeight: "600" },
  tipBanner:        { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "rgba(139,92,246,0.08)", borderRadius: 16, marginHorizontal: 16, marginBottom: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  tipText:          { flex: 1, fontSize: 12, color: "#a78bfa", lineHeight: 18 },
  catScroll:        { marginBottom: 14 },
  catScrollContent: { paddingHorizontal: 16, gap: 8 },
  catChip:          { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.03)" },
  catChipActive:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catChipText:      { fontSize: 12, color: SUBTEXT, fontWeight: "600" },
  grid:             { paddingHorizontal: 16, gap: 14 },
  videoCard:        { backgroundColor: CARD, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: BORDER },
  thumbnail:        { height: 140, alignItems: "center", justifyContent: "center", position: "relative" },
  thumbnailEmoji:   { fontSize: 56 },
  playBtn:          { position: "absolute", bottom: 10, right: 10 },
  thumbnailOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: "rgba(0,0,0,0.4)" },
  durationBadge:    { position: "absolute", bottom: 10, left: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  durationText:     { color: "white", fontSize: 11, fontWeight: "600" },
  videoInfo:        { padding: 14, gap: 6 },
  videoTopRow:      { flexDirection: "row", gap: 7 },
  levelBadge:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 2 },
  levelText:        { fontSize: 10, fontWeight: "700" },
  catBadge:         { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 2 },
  catBadgeText:     { fontSize: 10, fontWeight: "700" },
  videoTitle:       { fontSize: 15, fontWeight: "700", color: TEXT },
  videoDesc:        { fontSize: 12, color: SUBTEXT, lineHeight: 17 },
  watchRow:         { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  watchText:        { fontSize: 12, color: "#ef4444", fontWeight: "600", flex: 1 },
  disclaimer:       { flexDirection: "row", gap: 8, alignItems: "flex-start", marginHorizontal: 16, marginTop: 4, padding: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  disclaimerText:   { flex: 1, fontSize: 11, color: "#4b5563", lineHeight: 16 },
});
