// src/screens/SafeRouteScreen.js
// Safe Route with real safety score, turn-by-turn navigation, and expanded map

import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Animated
} from "react-native";
import * as Location from "expo-location";
import { analyzeRoute } from "../api/gemini";
import { Ionicons } from "@expo/vector-icons";

let MapView, Marker, Polyline;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

import { PRIMARY, TEXT, SUBTEXT, PINK, SUCCESS, WARNING, DANGER, BG, CARD, BORDER } from "../theme/colors";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

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

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

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
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data.predictions || []);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 350);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { suggestions, loading, clear: () => setSuggestions([]) };
}

function SuggestionList({ suggestions, loading, onSelect }) {
  if (!suggestions.length && !loading) return null;
  return (
    <View style={sd.container}>
      {loading && <ActivityIndicator color={PRIMARY} style={{ padding: 10 }} />}
      {suggestions.map((s, i) => (
        <TouchableOpacity key={s.place_id} style={[sd.item, i < suggestions.length - 1 && sd.itemBorder]} onPress={() => onSelect(s.description)} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={14} color={SUBTEXT} />
          <View style={{ flex: 1 }}>
            <Text style={sd.mainText} numberOfLines={1}>{s.structured_formatting?.main_text || s.description}</Text>
            {s.structured_formatting?.secondary_text && <Text style={sd.subText} numberOfLines={1}>{s.structured_formatting.secondary_text}</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sd = StyleSheet.create({
  container: { backgroundColor: "#12082a", borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginTop: 4, overflow: "hidden", zIndex: 999 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.1)" },
  mainText: { fontSize: 13, color: TEXT, fontWeight: "500" },
  subText: { fontSize: 11, color: SUBTEXT, marginTop: 1 },
});

export default function SafeRouteScreen() {
  const [from, setFrom] = useState("Locating...");
  const [to, setTo] = useState("");
  const [toEditing, setToEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [routesData, setRoutesData] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [destRegion, setDestRegion] = useState(null);
  const [region, setRegion] = useState({ latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 });

  const [safeSpots, setSafeSpots] = useState([]);
  const [scoreData, setScoreData] = useState(null);
  const [insights, setInsights] = useState(null);

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const sessionToken = useRef(Math.random().toString(36)).current;

  const { suggestions, loading: sugLoading, clear } = usePlacesAutocomplete(toEditing ? to : "", sessionToken);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setFrom(""); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 });
        const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo) {
          setFrom([geo.name, geo.street, geo.city].filter(Boolean).join(", ") || "My Location");
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

  const fetchNearbyCount = async (lat, lng, type, radius = 2000) => {
    if (!GOOGLE_KEY) return [];
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_KEY}`);
      const data = await res.json();
      return data.results || [];
    } catch { return []; }
  };

  const getCoords = async (query, defaultCoords) => {
    if (query === "My Location" || !query) return defaultCoords;
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results?.[0]) return data.results[0].geometry.location;
    } catch { }
    return defaultCoords;
  };

  const analyze = async () => {
    if (!to.trim() || !from.trim() || from === "Locating...") return;
    setLoading(true);
    setRoutesData([]); setSelectedRouteIndex(0); setDestRegion(null); setSafeSpots([]); setScoreData(null); setInsights(null);
    scoreAnim.setValue(0);

    try {
      if (!GOOGLE_KEY) throw new Error("No Maps Key");

      const fromCoords = await getCoords(from, { lat: region.latitude, lng: region.longitude });
      const toCoords = await getCoords(to, null);
      if (!toCoords) throw new Error("Destination not geocodable");

      // 1. OSRM Multi-Route API logic completely replaces Google Directions API
      const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?overview=full&geometries=geojson&alternatives=true`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();

      let routeDistanceM = 0;
      let midLat = region.latitude, midLng = region.longitude;
      let localRouteCount = 0;

      if (osrmData.routes?.length > 0) {
        let allRoutes = osrmData.routes.map((rt) => {
          const coords = rt.geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] }));
          return { coordinates: coords, duration: rt.duration, distance: rt.distance };
        });

        // Sort by duration so index 0 is fastest
        allRoutes.sort((a, b) => a.duration - b.duration);
        setRoutesData(allRoutes);
        setSelectedRouteIndex(0);
        localRouteCount = allRoutes.length;

        const bestRoute = allRoutes[0];
        routeDistanceM = bestRoute.distance;
        const points = bestRoute.coordinates;

        if (points.length > 0) {
          const mid = points[Math.floor(points.length / 2)];
          midLat = mid.latitude;
          midLng = mid.longitude;
          setRegion({ latitude: midLat, longitude: midLng, latitudeDelta: 0.08, longitudeDelta: 0.08 });
          setDestRegion(points[points.length - 1]);
        }
      }

      // 2. Real Places API data (hospitals + police)
      const police = await fetchNearbyCount(midLat, midLng, "police", 2000);
      const hospitals = await fetchNearbyCount(midLat, midLng, "hospital", 2000);

      // Convert to map markers
      const spots = [];
      police.slice(0, 3).forEach(p => spots.push({ id: p.place_id, type: "police", name: p.name, coords: p.geometry.location }));
      hospitals.slice(0, 2).forEach(h => spots.push({ id: h.place_id, type: "hospital", name: h.name, coords: h.geometry.location }));
      setSafeSpots(spots);

      // 3. Deterministic Safety Score
      const hour = new Date().getHours();
      let score = 100;
      if (hour >= 22 || hour < 5) score -= 20;
      if (routeDistanceM > 5000) score -= 10;
      if (police.length === 0) score -= 15;
      if (hospitals.length === 0) score -= 10;
      if (hasWarnings) score -= 15;
      score = Math.max(10, Math.min(100, score));

      // Animated score
      Animated.timing(scoreAnim, {
        toValue: score,
        duration: 1500,
        useNativeDriver: false
      }).start();

      let recLabel = "safest";
      if (score < 50) recLabel = "avoid";
      else if (score < 75) recLabel = "moderate";
      setScoreData({ score, label: recLabel, policeCount: police.length, hospitalCount: hospitals.length, isNight: (hour >= 20 || hour < 5) });

      // 4. Gemini explains the score
      const context = `
Route Distance: ${routeDistanceM} meters
Time: ${hour >= 22 || hour < 5 ? "Late Night" : "Daytime"}
Police Stations within 2km: ${police.length}
Hospitals within 2km: ${hospitals.length}
Routing Alternative Count: ${localRouteCount}
      `;
      const aiData = await analyzeRoute(from, to, context);
      setInsights(aiData);

    } catch (e) {
      console.error("Route error:", e);
    }
    setLoading(false);
  };

  const SCORE_COLORS = { safest: SUCCESS, moderate: WARNING, avoid: DANGER };
  const SCORE_TEXTS = { safest: "Recommended", moderate: "Use With Caution", avoid: "Avoid This Route" };

  const interpolatedScoreWidth = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"]
  });

  const getManeuverIcon = (man) => {
    if (man.includes("left")) return "arrow-undo-outline";
    if (man.includes("right")) return "arrow-redo-outline";
    if (man.includes("u-turn")) return "arrow-undo-circle-outline";
    return "arrow-up-outline";
  };

  return (
    <View style={s.container}>
      {/* ── MAP (Expanded) ───────────────────────────────────────────────────── */}
      <View style={s.mapContainer}>
        {Platform.OS === "web" ? (
          <View style={s.mapPlaceholder}><Text style={{ color: SUBTEXT }}>Map on mobile</Text></View>
        ) : MapView ? (
          <MapView style={{ flex: 1 }} region={region} showsUserLocation customMapStyle={darkMapStyle}>
            {!routesData.length && <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Start" pinColor={PRIMARY} />}
            {destRegion && <Marker coordinate={{ latitude: destRegion.latitude, longitude: destRegion.longitude }} title="Destination" pinColor={PINK} />}
            {routesData.map((rt, index) => {
              const isSelected = index === selectedRouteIndex;
              return (
                <Polyline
                  key={index}
                  coordinates={rt.coordinates}
                  strokeWidth={isSelected ? 6 : 4}
                  strokeColor={isSelected ? PRIMARY : SUBTEXT}
                  zIndex={isSelected ? 10 : 1}
                  tappable
                  onPress={() => setSelectedRouteIndex(index)}
                />
              )
            })}
            {safeSpots.map(spot => (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.coords.lat, longitude: spot.coords.lng }}
                title={spot.name}
                description={spot.type === "police" ? "Police Station" : "Hospital"}
              >
                <View style={[s.spotPin, { backgroundColor: spot.type === "police" ? PRIMARY : SUCCESS }]}>
                  <Ionicons name={spot.type === 'police' ? "shield-half" : "medkit"} size={12} color="#fff" />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : null}
      </View>

      {/* ── DETAILS PANEL ────────────────────────────────────────────────────── */}
      <ScrollView style={s.panel} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* INPUT CARD */}
        <View style={s.inputCard}>
          <View style={s.inputRow}>
            <View style={s.inputDot}><View style={s.dotFill} /></View>
            <TextInput style={s.input} value={from} onChangeText={setFrom} placeholder="Current location" placeholderTextColor="#4b5563" />
          </View>
          <View style={s.inputDivider} />
          <View style={s.inputRow}>
            <Ionicons name="location" size={16} color={PINK} />
            <TextInput style={s.input} value={to} onChangeText={v => { setTo(v); setToEditing(true); }} onFocus={() => setToEditing(true)} onBlur={() => setTimeout(() => setToEditing(false), 200)} placeholder="Destination" placeholderTextColor="#4b5563" returnKeyType="search" onSubmitEditing={analyze} />
          </View>
          {toEditing && <SuggestionList suggestions={suggestions} loading={sugLoading} onSelect={selectSuggestion} />}
          <TouchableOpacity style={s.btn} onPress={analyze} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Analyze Safety</Text>}
          </TouchableOpacity>
        </View>

        {/* RESULTS SECTION */}
        {scoreData && (
          <View style={s.results}>

            {/* OSRM Route Selector Chips */}
            {routesData.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", gap: 10, paddingVertical: 4 }}>
                  {routesData.map((route, i) => {
                    const isActive = i === selectedRouteIndex;
                    return (
                      <TouchableOpacity key={i} onPress={() => setSelectedRouteIndex(i)} activeOpacity={0.8}
                        style={[s.routeChip, isActive && s.routeChipActive]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="time-outline" size={14} color={isActive ? "#fff" : SUBTEXT} />
                          <Text style={[s.routeChipTime, isActive && s.routeChipTimeActive]}>
                            {formatDuration(route.duration)}
                          </Text>
                        </View>
                        <Text style={s.routeChipDist}>{formatDistance(route.distance)} route</Text>
                        {i === 0 && (
                          <View style={s.fastestBadge}>
                            <Text style={s.fastestText}>Fastest</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Animated Score Arc */}
            <View style={s.scoreBox}>
              <View style={s.scoreHeader}>
                <Text style={s.scoreTitle}>Safety Score</Text>
                <Text style={[s.scoreNum, { color: SCORE_COLORS[scoreData.label] }]}>{scoreData.score}/100</Text>
              </View>
              <View style={s.scoreTrack}>
                <Animated.View style={[s.scoreFill, { width: interpolatedScoreWidth, backgroundColor: SCORE_COLORS[scoreData.label] }]} />
              </View>
              <Text style={[s.scoreFooterText, { color: SCORE_COLORS[scoreData.label] }]}>{SCORE_TEXTS[scoreData.label]}</Text>
            </View>

            {/* AI Insights & Real Signals */}
            <View style={s.signalsCard}>
              <Text style={s.sectionLabel}>SAFETY SIGNALS</Text>
              <View style={s.signalRow}>
                <Ionicons name="shield-checkmark" size={16} color={PRIMARY} />
                <Text style={s.signalText}>{scoreData.policeCount} police stations nearby</Text>
              </View>
              <View style={s.signalRow}>
                <Ionicons name="medkit" size={16} color={SUCCESS} />
                <Text style={s.signalText}>{scoreData.hospitalCount} hospitals nearby</Text>
              </View>
              <View style={s.signalRow}>
                <Ionicons name={scoreData.isNight ? "moon" : "sunny"} size={16} color={scoreData.isNight ? WARNING : "#fbbf24"} />
                <Text style={s.signalText}>{scoreData.isNight ? "Late night — extra caution required" : "Daytime visibility is good"}</Text>
              </View>
            </View>

            {/* AI Highlights */}
            {insights && insights.highlights && (
              <View style={s.insightsCard}>
                <View style={s.aiHeader}><Ionicons name="sparkles" size={14} color={PINK} /><Text style={s.aiTitle}>AI Insights</Text></View>
                {insights.highlights.map((h, i) => (
                  <View key={i} style={s.hiRow}>
                    <View style={s.hiDot} />
                    <Text style={s.hiText}>{h}</Text>
                  </View>
                ))}
                {insights.tip && (
                  <View style={s.tipBox}>
                    <Ionicons name="bulb-outline" size={16} color={WARNING} />
                    <Text style={s.tipText}>{insights.tip}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  mapContainer: { flex: 0.45 },
  mapPlaceholder: { flex: 1, backgroundColor: CARD, alignItems: "center", justifyContent: "center" },
  spotPin: { padding: 4, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 2 },

  panel: { flex: 0.55, paddingHorizontal: 16, paddingTop: 16 },
  inputCard: { backgroundColor: CARD, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: BORDER, gap: 10, zIndex: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  inputDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  dotFill: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  input: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 8, height: 44 },
  inputDivider: { height: 1, backgroundColor: BORDER, marginLeft: 26 },
  btn: { backgroundColor: PRIMARY, borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  results: { marginTop: 16, gap: 12 },
  sectionLabel: { fontSize: 11, color: SUBTEXT, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 },

  scoreBox: { backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  scoreTitle: { fontSize: 13, color: SUBTEXT, fontWeight: "600" },
  scoreNum: { fontSize: 24, fontWeight: "800" },
  scoreTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 4 },
  scoreFooterText: { fontSize: 12, fontWeight: "700", marginTop: 8, textAlign: "right" },

  signalsCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: BORDER },
  signalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  signalText: { fontSize: 14, color: TEXT },

  insightsCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: BORDER },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  aiTitle: { fontSize: 12, color: PINK, fontWeight: "700", letterSpacing: 0.5 },
  hiRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  hiDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PINK, marginTop: 7 },
  hiText: { flex: 1, fontSize: 13, color: TEXT, lineHeight: 20 },
  tipBox: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 14, marginTop: 4, borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  tipText: { flex: 1, fontSize: 13, color: WARNING, lineHeight: 20 },

  routeChip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: BORDER, gap: 4, minWidth: 100 },
  routeChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  routeChipTime: { fontSize: 16, fontWeight: "800", color: TEXT },
  routeChipTimeActive: { color: "#fff" },
  routeChipDist: { fontSize: 11, color: SUBTEXT, fontWeight: "600" },
  fastestBadge: { position: "absolute", top: -8, right: -8, backgroundColor: SUCCESS, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderColor: BG },
  fastestText: { fontSize: 9, fontWeight: "800", color: "#fff", textTransform: "uppercase" },
});
