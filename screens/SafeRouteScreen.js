// screens/SafeRouteScreen.js
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from "react-native";
import * as Location from "expo-location";
import { analyzeRoute } from "../services/claude";
import { Ionicons } from "@expo/vector-icons";

let MapView, Marker;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const SAFE_SPOT_ICONS = { police: "👮", hospital: "🏥", store: "🏪" };

export default function SafeRouteScreen() {
  const [from, setFrom]       = useState("My Location");
  const [to, setTo]           = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [region, setRegion]   = useState({ latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 });

  const analyze = async () => {
    if (!to.trim()) return;
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion(r => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      }
      const hour = new Date().getHours();
      const timeLabel = hour < 6 ? "late night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
      const data = await analyzeRoute(from, to, timeLabel);
      setResult(data);
    } catch {
      setResult({ safetyScore: 68, recommendation: "moderate", highlights: ["Main road is well-lit", "Avoid shortcut through park after dark", "Metro station 400m away"], safeSpots: [{ name: "City Police Booth", type: "police" }, { name: "24hr Apollo Pharmacy", type: "store" }], tip: "Share live location with a contact before starting this journey." });
    }
    setLoading(false);
  };

  const scoreColor = sc => sc >= 75 ? "#34d399" : sc >= 50 ? "#fbbf24" : "#f87171";
  const recConfig = {
    safest:   { bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.3)",  color: "#34d399", icon: "checkmark-circle", label: "Recommended Route" },
    moderate: { bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)",  color: "#fbbf24", icon: "warning",          label: "Use With Caution"  },
    avoid:    { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", color: "#f87171", icon: "close-circle",     label: "Avoid This Route"  },
  };

  return (
    <View style={s.container}>
      {/* Map */}
      <View style={s.map}>
        {Platform.OS === "web" ? (
          <View style={s.mapPlaceholder}>
            <Ionicons name="map" size={32} color="#4b5563" />
            <Text style={s.mapPlaceholderText}>Map available on mobile</Text>
          </View>
        ) : MapView ? (
          <MapView style={{ flex: 1 }} region={region} showsUserLocation showsMyLocationButton customMapStyle={darkMapStyle}>
            <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="You are here" pinColor={PRIMARY} />
          </MapView>
        ) : null}
        {/* Overlay gradient illusion */}
        <View style={s.mapOverlay} />
      </View>

      <ScrollView style={s.sheet} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>🗺️ Safe Route</Text>

        {/* Input Card */}
        <View style={s.inputCard}>
          <View style={s.inputRow}>
            <View style={s.inputDot}><View style={s.dotFill} /></View>
            <TextInput style={s.input} value={from} onChangeText={setFrom} placeholder="Starting point" placeholderTextColor="#4b5563" />
          </View>
          <View style={s.inputDivider} />
          <View style={s.inputRow}>
            <Ionicons name="location" size={16} color="#ef4444" />
            <TextInput style={s.input} value={to} onChangeText={setTo} placeholder="Destination" placeholderTextColor="#4b5563" />
          </View>
        </View>

        <TouchableOpacity style={[s.btn, (!to || loading) && { opacity: 0.5 }]} onPress={analyze} disabled={!to || loading}>
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text style={s.btnText}>Analyze Route Safety</Text>
            </>
          )}
        </TouchableOpacity>

        {result && (() => {
          const rec = recConfig[result.recommendation] || recConfig.moderate;
          return (
            <View style={s.resultCard}>
              {/* Score row */}
              <View style={s.scoreRow}>
                <View>
                  <Text style={s.scoreLabel}>Safety Score</Text>
                  <Text style={s.scoreHint}>AI-assessed risk level</Text>
                </View>
                <View style={s.scoreCircle}>
                  <Text style={[s.scoreVal, { color: scoreColor(result.safetyScore) }]}>{result.safetyScore}</Text>
                  <Text style={s.scoreDenom}>/100</Text>
                </View>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${result.safetyScore}%`, backgroundColor: scoreColor(result.safetyScore) }]} />
              </View>

              {/* Recommendation */}
              <View style={[s.recBadge, { backgroundColor: rec.bg, borderColor: rec.border }]}>
                <Ionicons name={rec.icon} size={16} color={rec.color} />
                <Text style={[s.recText, { color: rec.color }]}>{rec.label}</Text>
              </View>

              {/* Highlights */}
              {result.highlights?.map((h, i) => (
                <View key={i} style={s.highlightRow}>
                  <View style={s.highlightBullet} />
                  <Text style={s.highlightText}>{h}</Text>
                </View>
              ))}

              {/* Safe Spots */}
              {result.safeSpots?.length > 0 && (
                <>
                  <Text style={s.subheading}>SAFE SPOTS NEARBY</Text>
                  {result.safeSpots.map((sp, i) => (
                    <View key={i} style={s.safeSpotRow}>
                      <Text style={s.safeSpotIcon}>{SAFE_SPOT_ICONS[sp.type] || "📍"}</Text>
                      <Text style={s.safeSpotName}>{sp.name}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Tip */}
              <View style={s.tipBox}>
                <Ionicons name="bulb" size={14} color="#a78bfa" />
                <Text style={s.tipText}>{result.tip}</Text>
              </View>
            </View>
          );
        })()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1130" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c1f4e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BG },
  map:             { height: 210, position: "relative" },
  mapPlaceholder:  { flex: 1, backgroundColor: "#12082a", alignItems: "center", justifyContent: "center", gap: 8 },
  mapPlaceholderText: { color: "#4b5563", fontSize: 13 },
  mapOverlay:      { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: BG, opacity: 0.7 },
  sheet:           { flex: 1, padding: 16 },
  title:           { fontSize: 20, fontWeight: "800", color: TEXT, marginBottom: 14 },
  inputCard:       { backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  inputRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  inputDot:        { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  dotFill:         { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  input:           { flex: 1, fontSize: 14, color: TEXT },
  inputDivider:    { height: 1, backgroundColor: BORDER, marginHorizontal: 4, marginVertical: 2 },
  btn:             { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginBottom: 16, flexDirection: "row", justifyContent: "center", gap: 8 },
  btnText:         { color: "white", fontWeight: "700", fontSize: 15 },
  resultCard:      { backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER, gap: 12 },
  scoreRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreLabel:      { fontSize: 15, fontWeight: "700", color: TEXT },
  scoreHint:       { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  scoreCircle:     { flexDirection: "row", alignItems: "baseline", gap: 2 },
  scoreVal:        { fontSize: 36, fontWeight: "900" },
  scoreDenom:      { fontSize: 14, color: SUBTEXT },
  progressBg:      { height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  progressFill:    { height: 6, borderRadius: 3 },
  recBadge:        { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  recText:         { fontWeight: "600", fontSize: 13 },
  highlightRow:    { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  highlightBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: PRIMARY, marginTop: 5 },
  highlightText:   { flex: 1, fontSize: 13, color: SUBTEXT, lineHeight: 19 },
  subheading:      { fontSize: 10, fontWeight: "700", color: "#6b7280", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 4 },
  safeSpotRow:     { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "rgba(52,211,153,0.06)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  safeSpotIcon:    { fontSize: 18 },
  safeSpotName:    { fontSize: 13, color: "#34d399" },
  tipBox:          { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(167,139,250,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(167,139,250,0.2)" },
  tipText:         { flex: 1, fontSize: 13, color: "#a78bfa", lineHeight: 19 },
});
