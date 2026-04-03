// screens/NearbyScreen.js — Map-First Premium Redesign
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Animated, Dimensions, ActivityIndicator,
  Linking, Platform, Modal, Alert
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

let MapView, Marker, PROVIDER_GOOGLE, Circle;
if (Platform.OS !== "web") {
  const Maps   = require("react-native-maps");
  MapView       = Maps.default;
  Marker        = Maps.Marker;
  Circle        = Maps.Circle;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

const { width, height } = Dimensions.get("window");
const SHEET_PEEK    = 220; // how many px the bottom sheet peeks up above the fold
const BG            = "#0d0520";
const CARD          = "#1a1130";
const TEXT          = "#f1f0f5";
const SUBTEXT       = "#9ca3af";
const PRIMARY       = "#8b5cf6";
const BORDER        = "rgba(139,92,246,0.2)";
const GOOGLE_KEY    = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// ── Incident categories (for safety alerts on map) ──────────────────────────
const INCIDENT_TYPES = [
  { key: "suspicious",  label: "Suspicious activity", color: "#ef4444", icon: "alert-circle",       bg: "rgba(239,68,68,0.12)"  },
  { key: "lighting",    label: "Poor lighting",        color: "#f59e0b", icon: "bulb-outline",       bg: "rgba(245,158,11,0.12)" },
  { key: "police",      label: "Police presence",      color: "#3b82f6", icon: "shield",             bg: "rgba(59,130,246,0.12)" },
  { key: "hospital",    label: "Hospital",             color: "#ec4899", icon: "medical",            bg: "rgba(236,72,153,0.12)" },
  { key: "safe",        label: "Safe zone",            color: "#22c55e", icon: "checkmark-circle",   bg: "rgba(34,197,94,0.12)"  },
];

// Emergency fallback contacts
const EMERGENCY = [
  { id: "e1", name: "Police Control Room",  type: "police",   phone: "100", address: "National Emergency",   dist: null },
  { id: "e2", name: "Women Helpline",       type: "police",   phone: "181", address: "24×7 Toll-Free",        dist: null },
  { id: "e3", name: "National Emergency",   type: "police",   phone: "112", address: "All Emergencies",       dist: null },
  { id: "e4", name: "Ambulance",            type: "hospital", phone: "108", address: "National Ambulance",    dist: null },
];

// Demo map incidents to match the UI from the design reference
const DEMO_INCIDENTS = [
  { id: "i1", type: "suspicious", label: "Suspicious activity", dist: "200m", ago: "5m",  lat: null, lng: null },
  { id: "i2", type: "lighting",   label: "Poor lighting",       dist: "450m", ago: "12m", lat: null, lng: null },
  { id: "i3", type: "police",     label: "Police presence",     dist: "300m", ago: "2m",  lat: null, lng: null },
];

function getTypeMeta(type) {
  return INCIDENT_TYPES.find(t => t.key === type) || INCIDENT_TYPES[0];
}

// ── Custom map marker (colored teardrop with icon) ──────────────────────────
function MarkerBubble({ type, size = 44 }) {
  const meta = getTypeMeta(type);
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: meta.color, alignItems: "center", justifyContent: "center",
        shadowColor: meta.color, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
      }}>
        <Ionicons name={meta.icon} size={size * 0.42} color="white" />
      </View>
      {/* teardrop tail */}
      <View style={{
        width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5,
        borderTopWidth: 8, borderLeftColor: "transparent",
        borderRightColor: "transparent", borderTopColor: meta.color,
        marginTop: -1,
      }} />
    </View>
  );
}

// ── Incident card (horizontal row) ───────────────────────────────────────────
function IncidentCard({ item, onPress }) {
  const meta = getTypeMeta(item.type);
  return (
    <TouchableOpacity
      style={[s.incCard, { borderColor: meta.color + "50", backgroundColor: meta.bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.incCardHeader]}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[s.incCardCategory, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <Text style={s.incCardTitle}>{item.name || item.label}</Text>
      {item.dist && <Text style={s.incCardDist}>{item.dist} away</Text>}
      <View style={s.incCardFooter}>
        <Text style={s.incCardAgo}>Reported {item.ago || "just now"}</Text>
        <TouchableOpacity style={[s.viewBtn, { borderColor: meta.color + "60" }]}>
          <Text style={[s.viewBtnText, { color: meta.color }]}>View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Place card (vertical list) ───────────────────────────────────────────────
function PlaceCard({ place, onCall, onNavigate }) {
  const meta   = getTypeMeta(place.type);
  return (
    <View style={[s.placeCard, { borderLeftColor: meta.color, borderLeftWidth: 3 }]}>
      <View style={[s.placeIconWrap, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={s.placeInfo}>
        <Text style={s.placeName} numberOfLines={1}>{place.name}</Text>
        <Text style={s.placeAddr} numberOfLines={1}>{place.address || "Emergency service"}</Text>
        {place.rating && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="star" size={11} color="#fbbf24" />
            <Text style={s.placeRating}>{place.rating}</Text>
            {place.open === true  && <Text style={[s.placeRating, { color: "#4ade80" }]}>· Open</Text>}
            {place.open === false && <Text style={[s.placeRating, { color: "#ef4444" }]}>· Closed</Text>}
          </View>
        )}
      </View>
      <View style={s.placeActions}>
        {place.phone && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e30" }]}
            onPress={() => onCall(place.phone)}>
            <Ionicons name="call" size={14} color="#22c55e" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: PRIMARY + "18", borderColor: BORDER }]}
          onPress={() => onNavigate(place)}>
          <Ionicons name="navigate" size={14} color={PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NearbyScreen() {
  const [location,    setLocation]    = useState(null);
  const [places,      setPlaces]      = useState([]);
  const [incidents,   setIncidents]   = useState(DEMO_INCIDENTS);
  const [loading,     setLoading]     = useState(true);
  const [noKey,       setNoKey]       = useState(false);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [reportModal, setReportModal] = useState(false);
  const [repType,     setRepType]     = useState("suspicious");
  const [repNote,     setRepNote]     = useState("");
  const [region,      setRegion]      = useState({
    latitude: 28.6139, longitude: 77.2090,
    latitudeDelta: 0.025, longitudeDelta: 0.025,
  });

  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadNearby(); }, []);

  useEffect(() => {
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 9 }).start();
  }, [loading]);

  const loadNearby = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setNoKey(true); setLoading(false); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 });

      // Place demo incidents around user
      setIncidents(prev => prev.map((inc, i) => ({
        ...inc,
        lat: latitude  + (i % 2 === 0 ? 0.004 : -0.003) * (i + 1),
        lng: longitude + (i % 2 === 0 ? -0.003 : 0.005) * (i + 1),
      })));

      if (!GOOGLE_KEY) { setNoKey(true); setLoading(false); return; }

      const [policeRes, hospRes] = await Promise.all([
        fetchNearby(latitude, longitude, "police"),
        fetchNearby(latitude, longitude, "hospital"),
      ]);
      setPlaces([...policeRes, ...hospRes]);
    } catch (e) {
      console.error("Nearby error:", e);
      setNoKey(true);
    }
    setLoading(false);
  };

  const fetchNearby = async (lat, lng, type) => {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${type}&key=${GOOGLE_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    return (data.results || []).slice(0, 8).map(p => ({
      id:      p.place_id,
      name:    p.name,
      type,
      address: p.vicinity,
      rating:  p.rating,
      open:    p.opening_hours?.open_now,
      lat:     p.geometry.location.lat,
      lng:     p.geometry.location.lng,
      phone:   null,
    }));
  };

  const openMaps  = (place) => {
    const q = place.lat ? `${place.lat},${place.lng}` : place.name;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
  };
  const callPlace = (phone) => Linking.openURL(`tel:${phone}`);

  const submitReport = () => {
    const meta  = getTypeMeta(repType);
    const newInc = {
      id:   "u" + Date.now(),
      type: repType,
      label: meta.label,
      name:  repNote || meta.label,
      dist:  "~here",
      ago:   "just now",
      lat:   location?.latitude  ? location.latitude  + (Math.random() - 0.5) * 0.004 : null,
      lng:   location?.longitude ? location.longitude + (Math.random() - 0.5) * 0.004 : null,
    };
    setIncidents(prev => [newInc, ...prev]);
    setReportModal(false);
    setRepNote("");
  };

  const listSource  = noKey ? EMERGENCY : places;
  const filtered    = filter === "all"
    ? listSource
    : listSource.filter(p => p.type === filter);

  const mapStyle = [
    { elementType: "geometry",            stylers: [{ color: "#1a0a2e" }] },
    { elementType: "labels.text.stroke",  stylers: [{ color: "#0d0520" }] },
    { elementType: "labels.text.fill",    stylers: [{ color: "#9ca3af" }] },
    { featureType: "road",                elementType: "geometry", stylers: [{ color: "#2d1b4e" }] },
    { featureType: "water",               elementType: "geometry", stylers: [{ color: "#0f2547" }] },
    { featureType: "poi.park",            elementType: "geometry", stylers: [{ color: "#0d3320" }] },
    { featureType: "administrative",      elementType: "geometry.stroke", stylers: [{ color: "#3d1f6e" }] },
  ];

  return (
    <View style={s.root}>

      {/* ── Full-screen Map ─────────────────────────────────────────────────── */}
      <View style={s.mapContainer}>
        {Platform.OS !== "web" && MapView ? (
          <MapView
            style={StyleSheet.absoluteFill}
            region={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation
            showsMyLocationButton={false}
            customMapStyle={mapStyle}
            provider={PROVIDER_GOOGLE}
          >
            {/* Safety incident markers */}
            {incidents.filter(i => typeof i.lat === "number" && typeof i.lng === "number").map(inc => (
              <Marker
                key={inc.id}
                coordinate={{ latitude: inc.lat, longitude: inc.lng }}
                title={inc.label}
              >
                <MarkerBubble type={inc.type} />
              </Marker>
            ))}

            {/* Nearby place markers */}
            {!noKey && places.filter(p => typeof p.lat === "number" && typeof p.lng === "number").map(p => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                title={p.name}
              >
                <MarkerBubble type={p.type} size={36} />
              </Marker>
            ))}

            {/* User location pulse ring */}
            {location && typeof location.latitude === "number" && typeof location.longitude === "number" && (
              <Circle
                center={location}
                radius={80}
                strokeColor="rgba(59,130,246,0.5)"
                fillColor="rgba(59,130,246,0.12)"
              />
            )}
          </MapView>
        ) : (
          <View style={s.mapFallback}>
            <Ionicons name="map-outline" size={44} color="#4b5563" />
            <Text style={s.mapFallbackText}>Map available on Android</Text>
            <Text style={s.mapFallbackSub}>Showing emergency numbers below</Text>
          </View>
        )}

        {/* Floating search bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={SUBTEXT} />
          <TextInput
            style={s.searchInput}
            placeholder="Search location or address"
            placeholderTextColor="#6b7280"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={SUBTEXT} />
            </TouchableOpacity>
          )}
        </View>

        {/* My location button */}
        <TouchableOpacity style={s.myLocBtn} onPress={loadNearby}>
          <Ionicons name="locate" size={18} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Sheet ────────────────────────────────────────────────────── */}
      <View style={s.sheet}>
        {/* Drag handle */}
        <View style={s.sheetHandle} />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={s.loadingText}>Finding nearby help…</Text>
          </View>
        ) : (
          <>
            {/* ── Incident Cards horizontal scroll ─────────────────────── */}
            {incidents.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.incRow}
                style={s.incScroll}
              >
                {incidents.map(inc => (
                  <IncidentCard
                    key={inc.id}
                    item={inc}
                    onPress={() => {
                      if (inc.lat) setRegion(r => ({ ...r, latitude: inc.lat, longitude: inc.lng }));
                    }}
                  />
                ))}
              </ScrollView>
            )}

            {/* ── Filter tabs ───────────────────────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
              style={{ marginBottom: 10 }}
            >
              {[{ key: "all", label: "All", color: PRIMARY }, ...INCIDENT_TYPES.slice(0, 4)].map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filterChip, filter === f.key && { backgroundColor: f.color + "22", borderColor: f.color + "55" }]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[s.filterChipText, filter === f.key && { color: f.color }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* noKey banner */}
            {noKey && (
              <View style={s.alertBanner}>
                <Ionicons name="information-circle" size={14} color="#fbbf24" />
                <Text style={s.alertBannerText}>Showing emergency numbers — enable location for live results</Text>
              </View>
            )}

            {/* ── Place list ───────────────────────────────────────────── */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons name="location-outline" size={32} color="#4b5563" />
                  <Text style={s.emptyText}>No results for this filter</Text>
                </View>
              ) : (
                filtered.map((place, i) => (
                  <PlaceCard
                    key={place.id || i}
                    place={place}
                    onCall={callPlace}
                    onNavigate={openMaps}
                  />
                ))
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          </>
        )}
      </View>

      {/* ── FAB: Report an Incident ─────────────────────────────────────────── */}
      <View style={s.fabArea}>
        <Text style={s.fabLabel}>Report an Incident</Text>
        <TouchableOpacity style={s.fab} onPress={() => setReportModal(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── Report Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={reportModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Report an Incident</Text>
              <TouchableOpacity onPress={() => setReportModal(false)}>
                <Ionicons name="close" size={20} color={SUBTEXT} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>INCIDENT TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {INCIDENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.typeChip, repType === t.key && { backgroundColor: t.color + "22", borderColor: t.color }]}
                    onPress={() => setRepType(t.key)}
                  >
                    <Ionicons name={t.icon} size={14} color={repType === t.key ? t.color : SUBTEXT} />
                    <Text style={[s.typeChipText, repType === t.key && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.modalLabel}>DETAILS (optional)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Describe what you observed…"
              placeholderTextColor="#4b5563"
              value={repNote}
              onChangeText={setRepNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity style={s.submitBtn} onPress={submitReport}>
              <Ionicons name="send" size={16} color="white" />
              <Text style={s.submitBtnText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },

  // Map
  mapContainer:   { flex: 1 },
  mapFallback:    { flex: 1, backgroundColor: "#0d0520", alignItems: "center", justifyContent: "center", gap: 10 },
  mapFallbackText:{ color: "#6b7280", fontSize: 15, fontWeight: "600" },
  mapFallbackSub: { color: "#4b5563", fontSize: 12 },

  // Search bar floating
  searchBar:      {
    position: "absolute", top: 52, left: 16, right: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(13,5,32,0.92)", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  searchInput:    { flex: 1, color: TEXT, fontSize: 15 },

  // My location button
  myLocBtn:       {
    position: "absolute", bottom: 240, right: 16,
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(13,5,32,0.9)", borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  // Bottom Sheet
  sheet:          {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: height * 0.5,
    backgroundColor: "#0d0520",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: BORDER,
    paddingTop: 10, paddingHorizontal: 0,
    shadowColor: "#8b5cf6", shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  sheetHandle:    { width: 40, height: 4, backgroundColor: "#4b5563", borderRadius: 2, alignSelf: "center", marginBottom: 14 },

  // Incident horizontal cards
  incScroll:      { marginBottom: 12 },
  incRow:         { paddingHorizontal: 16, gap: 12, paddingRight: 24 },
  incCard:        {
    width: 180, borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 4,
    backgroundColor: "rgba(26,17,48,0.8)",
  },
  incCardHeader:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  incCardCategory:{ fontSize: 11, fontWeight: "700" },
  incCardTitle:   { fontSize: 15, fontWeight: "800", color: TEXT },
  incCardDist:    { fontSize: 11, color: SUBTEXT },
  incCardFooter:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  incCardAgo:     { fontSize: 10, color: "#4b5563" },
  viewBtn:        { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  viewBtnText:    { fontSize: 11, fontWeight: "700" },

  // Filter
  filterRow:      { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip:     { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.03)" },
  filterChipText: { fontSize: 12, color: SUBTEXT, fontWeight: "600" },

  // Alert banner
  alertBanner:    { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 10, padding: 10, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)" },
  alertBannerText:{ flex: 1, color: "#fbbf24", fontSize: 11, lineHeight: 16 },

  // Loading
  loadingBox:     { alignItems: "center", paddingTop: 40, gap: 14 },
  loadingText:    { color: SUBTEXT, fontSize: 14 },
  emptyBox:       { alignItems: "center", paddingTop: 30, gap: 10 },
  emptyText:      { color: SUBTEXT, fontSize: 14 },

  // Place cards
  placeCard:      { flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 16, padding: 12, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER, gap: 12 },
  placeIconWrap:  { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  placeInfo:      { flex: 1 },
  placeName:      { fontSize: 13, fontWeight: "700", color: TEXT },
  placeAddr:      { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  placeRating:    { fontSize: 11, color: "#6b7280" },
  placeActions:   { flexDirection: "row", gap: 6 },
  actionBtn:      { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  // FAB
  fabArea:        { position: "absolute", bottom: height * 0.5 - 28, right: 16, alignItems: "flex-end", gap: 6 },
  fabLabel:       { fontSize: 11, color: SUBTEXT, backgroundColor: "rgba(13,5,32,0.8)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  fab:            { width: 56, height: 56, borderRadius: 18, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", shadowColor: "#ef4444", shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },

  // Report Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard:      { backgroundColor: "#0d0520", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, borderColor: BORDER, gap: 12 },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle:     { fontSize: 18, fontWeight: "800", color: TEXT },
  modalLabel:     { fontSize: 10, color: "#6b7280", fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  typeChip:       { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.02)" },
  typeChipText:   { fontSize: 12, color: SUBTEXT, fontWeight: "600" },
  modalInput:     { borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, color: TEXT, fontSize: 14, backgroundColor: "rgba(255,255,255,0.03)", minHeight: 80 },
  submitBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#ef4444", borderRadius: 16, paddingVertical: 14, marginTop: 4 },
  submitBtnText:  { color: "white", fontWeight: "800", fontSize: 15 },
});
