// screens/SafeRouteScreen.js — With Google Places Autocomplete + Live Map
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, FlatList
} from "react-native";
import * as Location from "expo-location";
import { analyzeRoute } from "../api/claude";
import { Ionicons } from "@expo/vector-icons";

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
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";
const PINK    = "#ec4899";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const SAFE_SPOT_ICONS = { police: "shield-half-outline", hospital: "medkit-outline", store: "cart-outline" };

// ── Decodes Google's encoded polyline string ─────────────────────────────────
const decodePolyline = (t, e = 5) => {
  let n, o, r = 0, h = 0, i = 0, d = [], c = 0, a = 0, f = null, p = Math.pow(10, e);
  for (; r < t.length;) {
    f = null; c = 0; a = 0;
    do { f = t.charCodeAt(r++) - 63; a |= (31 & f) << c; c += 5; } while (f >= 32);
    n = 1 & a ? ~(a >> 1) : a >> 1; c = a = 0;
    do { f = t.charCodeAt(r++) - 63; a |= (31 & f) << c; c += 5; } while (f >= 32);
    o = 1 & a ? ~(a >> 1) : a >> 1; h += n; i += o;
    d.push({ latitude: h / p, longitude: i / p });
  }
  return d;
};

// ── Google Places Autocomplete hook ─────────────────────────────────────────
function usePlacesAutocomplete(query, sessionToken) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2 || !GOOGLE_KEY) {
      setSuggestions([]);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&sessiontoken=${sessionToken}&types=geocode|establishment&language=en`;
        const res  = await fetch(url);
        const data = await res.json();
        setSuggestions(data.predictions || []);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 350); // debounce 350ms
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { suggestions, loading, clear: () => setSuggestions([]) };
}

// ── Suggestion Dropdown ───────────────────────────────────────────────────────
function SuggestionList({ suggestions, loading, onSelect }) {
  if (!suggestions.length && !loading) return null;
  return (
    <View style={sd.container}>
      {loading && <ActivityIndicator color={PRIMARY} style={{ padding: 10 }} />}
      {suggestions.map((s, i) => (
        <TouchableOpacity
          key={s.place_id}
          style={[sd.item, i < suggestions.length - 1 && sd.itemBorder]}
          onPress={() => onSelect(s.description)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={14} color={SUBTEXT} />
          <View style={{ flex: 1 }}>
            <Text style={sd.mainText} numberOfLines={1}>{s.structured_formatting?.main_text || s.description}</Text>
            {s.structured_formatting?.secondary_text ? (
              <Text style={sd.subText} numberOfLines={1}>{s.structured_formatting.secondary_text}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sd = StyleSheet.create({
  container:  { backgroundColor: "#12082a", borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginTop: 4, overflow: "hidden", zIndex: 999 },
  item:       { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.1)" },
  mainText:   { fontSize: 13, color: TEXT, fontWeight: "500" },
  subText:    { fontSize: 11, color: SUBTEXT, marginTop: 1 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SafeRouteScreen() {
  const [from, setFrom]             = useState("Locating...");
  const [to, setTo]                 = useState("");
  const [toEditing, setToEditing]   = useState(false);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [routeLine, setRouteLine]   = useState(null);
  const [destRegion, setDestRegion] = useState(null);
  const [region, setRegion]         = useState({
    latitude: 28.6139, longitude: 77.2090,
    latitudeDelta: 0.05, longitudeDelta: 0.05
  });
  const sessionToken = useRef(Math.random().toString(36)).current;

  const { suggestions, loading: sugLoading, clear } = usePlacesAutocomplete(toEditing ? to : "", sessionToken);

  // All the currently edited field's suggestions (for "from" field too if needed)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setFrom(""); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 });
        const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo) {
          const addr = [geo.name, geo.street, geo.city].filter(Boolean).join(", ");
          setFrom(addr || "My Location");
        } else {
          setFrom(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
        }
      } catch { setFrom("My Location"); }
    })();
  }, []);

  const selectSuggestion = (description) => {
    setTo(description);
    setToEditing(false);
    clear();
  };

  const analyze = async () => {
    if (!to.trim() || !from.trim() || from === "Locating...") return;
    setLoading(true);
    setRouteLine(null);
    setDestRegion(null);
    let routeContext = `Route: ${from} to ${to}.`;

    try {
      if (GOOGLE_KEY) {
        const dirUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&key=${GOOGLE_KEY}`;
        const dirRes  = await fetch(dirUrl);
        const dirData = await dirRes.json();

        if (dirData.routes?.length > 0) {
          const route = dirData.routes[0];
          if (route.overview_polyline?.points) {
            const points = decodePolyline(route.overview_polyline.points);
            setRouteLine(points);
            if (points.length > 0) {
              const mid = points[Math.floor(points.length / 2)];
              setRegion({ latitude: mid.latitude, longitude: mid.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 });
              setDestRegion(points[points.length - 1]);
            }
          }
          if (route.legs?.[0]?.steps) {
            const steps = route.legs[0].steps.map(s => s.html_instructions.replace(/<[^>]+>/g, ""));
            routeContext += `\nSteps:\n${steps.join("\n")}.`;
          }
        }
      }
      const hour = new Date().getHours();
      const timeLabel = hour < 6 ? "late night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
      const data = await analyzeRoute(from, to, "Time: " + timeLabel + "\n\n" + routeContext);
      setResult(data);
    } catch (e) {
      console.error("Route error:", e);
      setResult({ safetyScore: 68, recommendation: "moderate", highlights: ["Could not fetch precise directions.", "AI fallback triggered."], safeSpots: [], tip: "Always share your live location." });
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
            {!routeLine && typeof region.latitude === "number" && (
              <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="You are here" pinColor={PRIMARY} />
            )}
            {destRegion && typeof destRegion.latitude === "number" && (
              <Marker coordinate={{ latitude: destRegion.latitude, longitude: destRegion.longitude }} title="Destination" pinColor={PINK} />
            )}
            {routeLine && routeLine.length > 1 && Polyline && (
              <Polyline coordinates={routeLine} strokeWidth={4} strokeColor={PRIMARY} />
            )}
          </MapView>
        ) : null}
        <View style={s.mapOverlay} />
      </View>

      <ScrollView style={s.sheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="map" size={20} color="#a78bfa" />
          <Text style={s.title}>Safe Route</Text>
        </View>

        {/* Input Card */}
        <View style={s.inputCard}>
          {/* From (auto-filled, read-only) */}
          <View style={s.inputRow}>
            <View style={s.inputDot}><View style={s.dotFill} /></View>
            <TextInput
              style={s.input}
              value={from}
              onChangeText={setFrom}
              placeholder="Starting point"
              placeholderTextColor="#4b5563"
            />
          </View>
          <View style={s.inputDivider} />
          {/* Destination with autocomplete */}
          <View style={s.inputRow}>
            <Ionicons name="location" size={16} color="#ef4444" />
            <TextInput
              style={s.input}
              value={to}
              onChangeText={v => { setTo(v); setToEditing(true); }}
              onFocus={() => setToEditing(true)}
              onBlur={() => setTimeout(() => setToEditing(false), 200)}
              placeholder="Where do you want to go?"
              placeholderTextColor="#4b5563"
              returnKeyType="search"
              onSubmitEditing={analyze}
            />
            {to.length > 0 && (
              <TouchableOpacity onPress={() => { setTo(""); clear(); }}>
                <Ionicons name="close-circle" size={16} color={SUBTEXT} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Google-powered Suggestions Dropdown */}
        {toEditing && (
          <SuggestionList
            suggestions={suggestions}
            loading={sugLoading}
            onSelect={selectSuggestion}
          />
        )}

        <TouchableOpacity
          style={[s.btn, (!to || loading || from === "Locating...") && { opacity: 0.5 }]}
          onPress={analyze}
          disabled={!to || loading || from === "Locating..."}
        >
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
              <View style={s.scoreRow}>
                <View>
                  <Text style={s.scoreLabel}>Safety Score</Text>
                  <Text style={s.scoreHint}>AI-assessed risk level</Text>
                </View>
                <View style={s.scoreCircle}>
                  <Text style={[s.scoreVal, { color: scoreColor(result.safetyScore) }]}>{result.safetyScore || "--"}</Text>
                  <Text style={s.scoreDenom}>/100</Text>
                </View>
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${result.safetyScore || 0}%`, backgroundColor: scoreColor(result.safetyScore || 0) }]} />
              </View>
              <View style={[s.recBadge, { backgroundColor: rec.bg, borderColor: rec.border }]}>
                <Ionicons name={rec.icon} size={16} color={rec.color} />
                <Text style={[s.recText, { color: rec.color }]}>{rec.label}</Text>
              </View>
              {result.highlights?.map((h, i) => (
                <View key={i} style={s.highlightRow}>
                  <View style={s.highlightBullet} />
                  <Text style={s.highlightText}>{h}</Text>
                </View>
              ))}
              {result.safeSpots?.length > 0 && (
                <>
                  <Text style={s.subheading}>SAFE SPOTS NEARBY</Text>
                  {result.safeSpots.map((sp, i) => (
                    <View key={i} style={s.safeSpotRow}>
                      <Ionicons name={SAFE_SPOT_ICONS[sp.type] || "location-outline"} size={18} color="#34d399" />
                      <Text style={s.safeSpotName}>{sp.name}</Text>
                    </View>
                  ))}
                </>
              )}
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
  container:          { flex: 1, backgroundColor: BG },
  map:                { height: 210, position: "relative" },
  mapPlaceholder:     { flex: 1, backgroundColor: "#12082a", alignItems: "center", justifyContent: "center", gap: 8 },
  mapPlaceholderText: { color: "#4b5563", fontSize: 13 },
  mapOverlay:         { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: BG, opacity: 0.7 },
  sheet:              { flex: 1, padding: 16 },
  title:              { fontSize: 20, fontWeight: "800", color: TEXT, marginBottom: 14 },
  inputCard:          { backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 4 },
  inputRow:           { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  inputDot:           { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  dotFill:            { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  input:              { flex: 1, fontSize: 14, color: TEXT },
  inputDivider:       { height: 1, backgroundColor: BORDER, marginHorizontal: 4, marginVertical: 2 },
  btn:                { backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginBottom: 16, marginTop: 12, flexDirection: "row", justifyContent: "center", gap: 8 },
  btnText:            { color: "white", fontWeight: "700", fontSize: 15 },
  resultCard:         { backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER, gap: 12 },
  scoreRow:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreLabel:         { fontSize: 15, fontWeight: "700", color: TEXT },
  scoreHint:          { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  scoreCircle:        { flexDirection: "row", alignItems: "baseline", gap: 2 },
  scoreVal:           { fontSize: 36, fontWeight: "900" },
  scoreDenom:         { fontSize: 14, color: SUBTEXT },
  progressBg:         { height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  progressFill:       { height: 6, borderRadius: 3 },
  recBadge:           { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 10 },
  recText:            { fontWeight: "600", fontSize: 13 },
  highlightRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  highlightBullet:    { width: 5, height: 5, borderRadius: 3, backgroundColor: PRIMARY, marginTop: 5 },
  highlightText:      { flex: 1, fontSize: 13, color: SUBTEXT, lineHeight: 19 },
  subheading:         { fontSize: 10, fontWeight: "700", color: "#6b7280", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 4 },
  safeSpotRow:        { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "rgba(52,211,153,0.06)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  safeSpotName:       { fontSize: 13, color: "#34d399" },
  tipBox:             { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(167,139,250,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(167,139,250,0.2)" },
  tipText:            { flex: 1, fontSize: 13, color: "#a78bfa", lineHeight: 19 },
});
