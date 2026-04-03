// screens/SafeRouteScreen.js — Premium Obsidian Redesign
import { useState, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, ActivityIndicator, Platform, Dimensions 
} from "react-native";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { analyzeRoute } from "../services/claude";

const { width } = Dimensions.get("window");

let MapView, Marker, Polyline;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView  = Maps.default;
  Marker   = Maps.Marker;
  Polyline = Maps.Polyline;
}

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const GREEN   = "#34d399";
const AMBER   = "#f59e0b";
const RED     = "#ef4444";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// Polyline decoder for Google Directions
const decodePolyline = (t, e = 5) => {
  let n, o, u, l, r = 0, h = 0, i = 0, d = [], c = 0, a = 0, f = null, p = Math.pow(10, e);
  for (; r < t.length;) {
    f = null, c = 0, a = 0;
    do f = t.charCodeAt(r++) - 63, a |= (31 & f) << c, c += 5; while (f >= 32);
    n = 1 & a ? ~(a >> 1) : a >> 1, c = a = 0;
    do f = t.charCodeAt(r++) - 63, a |= (31 & f) << c, c += 5; while (f >= 32);
    o = 1 & a ? ~(a >> 1) : a >> 1, h += n, i += o;
    d.push({ latitude: h / p, longitude: i / p });
  }
  return d;
};

export default function SafeRouteScreen() {
  const [from, setFrom]       = useState("Locating...");
  const [to, setTo]           = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeLine, setRouteLine] = useState(null);
  const [destPoint, setDestPoint] = useState(null);
  const [region, setRegion]   = useState({ latitude: 28.5355, longitude: 77.3910, latitudeDelta: 0.05, longitudeDelta: 0.05 });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setFrom("Current Location"); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const r = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 };
        setRegion(r);
        const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setFrom(geo ? `${geo.name || geo.street || "My Location"}` : "My Location");
      } catch { setFrom("My Location"); }
    })();
  }, []);

  const analyze = async () => {
    if (!to.trim() || loading) return;
    setLoading(true);
    setRouteLine(null);
    setResult(null);

    try {
      let routeData = "";
      if (GOOGLE_KEY) {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&key=${GOOGLE_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.[0]) {
          const r = data.routes[0];
          setRouteLine(decodePolyline(r.overview_polyline.points));
          setDestPoint(decodePolyline(r.overview_polyline.points).pop());
          routeData = r.legs[0].steps.map(s => s.html_instructions.replace(/<[^>]+>/g, "")).join(". ");
        }
      }
      const data = await analyzeRoute(from, to, routeData);
      setResult(data);
    } catch {
      setResult({ safetyScore: 72, recommendation: "moderate", highlights: ["Alternative route recommended.", "Standard lighting on path."], tip: "Share route with your Safe Circle." });
    }
    setLoading(false);
  };

  const getScoreColor = (s) => s > 80 ? GREEN : s > 50 ? AMBER : RED;

  return (
    <View style={s.root}>
      {/* ── Top Map Section ────────────────────────────────────────── */}
      <View style={s.mapContainer}>
        {Platform.OS === "web" ? (
          <View style={s.webMap}><Ionicons name="map-outline" size={40} color={BORDER} /><Text style={{color:SUBTEXT,marginTop:8}}>Map rendering on mobile</Text></View>
        ) : MapView ? (
          <MapView style={StyleSheet.absoluteFill} region={region} showsUserLocation customMapStyle={darkStyle}>
            {routeLine && <Polyline coordinates={routeLine} strokeWidth={5} strokeColor={result?.safetyScore > 70 ? GREEN : PRIMARY} />}
            {destPoint && <Marker coordinate={destPoint}><Ionicons name="location" size={32} color={PINK} /></Marker>}
          </MapView>
        ) : null}

        {/* Floating Safety Score Pill (from Stitch design) */}
        {result && (
          <View style={s.scoreOverlay}>
            <LinearGradient colors={["rgba(26,17,48,0.95)", "rgba(10,5,32,0.95)"]} style={s.scorePill}>
              <View style={[s.scoreCircle, { borderColor: getScoreColor(result.safetyScore) + "50" }]}>
                <Text style={[s.scoreVal, { color: getScoreColor(result.safetyScore) }]}>{result.safetyScore}%</Text>
              </View>
              <View>
                <Text style={s.scoreTitle}>Safety Score</Text>
                <Text style={s.scoreSub}>Gemini AI Analysis</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        {/* Bottom map fade */}
        <LinearGradient colors={["transparent", BG]} style={s.mapFade} />
      </View>

      {/* ── Floating Input & Content ───────────────────────────────── */}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Search Card */}
        <View style={s.searchCard}>
          <View style={s.inputWrapper}>
            <View style={s.dotLine}>
              <View style={s.dot} />
              <View style={s.line} />
              <Ionicons name="location" size={14} color={PINK} />
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              <TextInput style={s.input} value={from} onChangeText={setFrom} placeholder="Current location" placeholderTextColor="#4b5563" />
              <View style={s.divider} />
              <TextInput style={s.input} value={to} onChangeText={setTo} placeholder="Where are you going?" placeholderTextColor="#4b5563" autoFocus />
            </View>
          </View>

          <TouchableOpacity style={[s.goBtn, (!to || loading) && { opacity: 0.6 }]} onPress={analyze} disabled={!to || loading}>
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="white" />
                <Text style={s.goBtnText}>Analyze Route Safety</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {result && (
          <View style={s.resultsArea}>
            {/* Highlights */}
            <Text style={s.sectionTitle}>Route Highlights</Text>
            {result.highlights.map((h, i) => (
              <View key={i} style={s.featureCard}>
                <View style={[s.featureIcon, { backgroundColor: result.safetyScore > 70 ? GREEN + "15" : AMBER + "15" }]}>
                  <Ionicons name={result.safetyScore > 70 ? "shield-outline" : "warning-outline"} size={16} color={result.safetyScore > 70 ? GREEN : AMBER} />
                </View>
                <Text style={s.featureText}>{h}</Text>
              </View>
            ))}

            {/* Rec Badge */}
            <View style={[s.recBox, { borderColor: getScoreColor(result.safetyScore) + "40" }]}>
              <Ionicons name={result.recommendation === "safest" ? "checkmark-circle" : "alert-circle"} size={20} color={getScoreColor(result.safetyScore)} />
              <View>
                <Text style={[s.recTitle, { color: getScoreColor(result.safetyScore) }]}>
                  {result.recommendation.toUpperCase()} ROUTE
                </Text>
                <Text style={s.recDesc}>{result.tip}</Text>
              </View>
            </View>

            {/* Safe Spots */}
            {result.safeSpots?.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Safe Spots on Path</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.spotScroll}>
                  {result.safeSpots.map((sp, i) => (
                    <View key={i} style={s.spotCard}>
                      <Ionicons name={sp.type === "police" ? "shield" : "medkit"} size={24} color={PRIMARY} />
                      <Text style={s.spotName} numberOfLines={1}>{sp.name}</Text>
                      <Text style={s.spotType}>{sp.type}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const darkStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1130" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c1f4e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f0a1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7c3aed" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] }
];

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },
  mapContainer:   { height: 320, width: "100%", position: "relative" },
  webMap:         { flex: 1, backgroundColor: "#12082a", alignItems: "center", justifyContent: "center" },
  mapFade:        { position: "absolute", bottom: 0, left: 0, right: 0, height: 100 },
  
  // Floating Score Pill
  scoreOverlay:   { position: "absolute", top: 60, alignSelf: "center", width: "90%", zIndex: 10 },
  scorePill:      { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 24, borderWidth: 1, borderColor: BORDER, elevation: 10 },
  scoreCircle:    { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)" },
  scoreVal:       { fontSize: 18, fontWeight: "900" },
  scoreTitle:     { color: TEXT, fontSize: 15, fontWeight: "800" },
  scoreSub:       { color: PRIMARY, fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginTop: 1 },

  // Content
  content:        { flex: 1, marginTop: -40, paddingHorizontal: 16 },
  searchCard:     { backgroundColor: CARD, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: BORDER, elevation: 4, marginBottom: 20 },
  inputWrapper:   { flexDirection: "row", gap: 16, marginBottom: 20 },
  dotLine:        { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  line:           { width: 2, flex: 1, backgroundColor: BORDER, marginVertical: 4 },
  input:          { color: TEXT, fontSize: 15, fontWeight: "500" },
  divider:        { height: 1, backgroundColor: BORDER },
  goBtn:          { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  goBtnText:      { color: "white", fontWeight: "800", fontSize: 15 },

  // Results
  resultsArea:    { gap: 16 },
  sectionTitle:   { color: TEXT, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginLeft: 4, marginBottom: 4 },
  featureCard:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: BORDER },
  featureIcon:    { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText:    { flex: 1, color: SUBTEXT, fontSize: 13, fontWeight: "500" },
  recBox:         { borderLeftWidth: 4, backgroundColor: CARD, borderRadius: 18, padding: 16, paddingLeft: 20, flexDirection: "row", gap: 14, alignItems: "center", borderWidth: 1, borderColor: BORDER },
  recTitle:       { fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  recDesc:        { color: SUBTEXT, fontSize: 12, marginTop: 2, lineHeight: 18 },
  
  // Safe spots
  spotScroll:     { marginBottom: 8 },
  spotCard:       { backgroundColor: CARD, borderRadius: 18, padding: 16, alignItems: "center", width: 140, marginRight: 12, borderWidth: 1, borderColor: BORDER },
  spotName:       { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 8 },
  spotType:       { color: GREEN, fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
});
