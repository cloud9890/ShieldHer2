// screens/NearbyScreen.js
import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Linking, Platform
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

let MapView, Marker;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker  = Maps.Marker;
}

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyB8hborDSFZBu0jfY26LPDGuuRExGzUVUA";

// Fallback for when no API key is set
const EMERGENCY_CONTACTS = [
  { name: "Police Control Room",   type: "police",   phone: "100",    address: "National Emergency Number" },
  { name: "Women Helpline",        type: "police",   phone: "181",    address: "24×7 Toll-Free" },
  { name: "National Emergency",    type: "police",   phone: "112",    address: "All Emergencies" },
  { name: "Ambulance",             type: "hospital", phone: "108",    address: "National Ambulance" },
  { name: "AIIMS Helpline",        type: "hospital", phone: "1800-11-1000", address: "National Health Helpline" },
];

const FILTER_TABS = [
  { key: "all",     label: "All",       icon: "apps",    color: PRIMARY    },
  { key: "police",  label: "Police",    icon: "shield",  color: "#3b82f6"  },
  { key: "hospital",label: "Hospitals", icon: "medical", color: "#ec4899"  },
];

export default function NearbyScreen() {
  const [location,  setLocation]  = useState(null);
  const [places,    setPlaces]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");
  const [noKey,     setNoKey]     = useState(false);
  const [region,    setRegion]    = useState({ latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 });

  useEffect(() => { loadNearby(); }, []);

  const loadNearby = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setNoKey(true); setLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 });

      if (!GOOGLE_KEY) { setNoKey(true); setLoading(false); return; }

      // Fetch both police and hospitals
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
    const res = await fetch(url);
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

  const openMaps = (place) => {
    const q = place.lat ? `${place.lat},${place.lng}` : place.name;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
  };

  const callPlace = (phone) => Linking.openURL(`tel:${phone}`);

  const filtered = noKey
    ? EMERGENCY_CONTACTS.filter(p => filter === "all" || p.type === filter)
    : places.filter(p => filter === "all" || p.type === filter);

  const markerColor = (type) => type === "police" ? "#3b82f6" : "#ec4899";

  return (
    <View style={s.container}>
      {/* Map */}
      <View style={s.map}>
        {Platform.OS !== "web" && MapView ? (
          <MapView style={{ flex: 1 }} region={region} showsUserLocation showsMyLocationButton>
            {!noKey && places.map(p => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                title={p.name}
                description={p.address}
                pinColor={markerColor(p.type)}
              />
            ))}
          </MapView>
        ) : (
          <View style={s.mapPlaceholder}>
            <Ionicons name="map" size={32} color="#4b5563" />
            <Text style={s.mapPlaceholderText}>Map available on mobile</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.title}>📍 Nearby Help</Text>
          <TouchableOpacity style={s.refreshBtn} onPress={loadNearby}>
            <Ionicons name="refresh" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {noKey && (
          <View style={s.alertBanner}>
            <Ionicons name="information-circle" size={16} color="#fbbf24" />
            <Text style={s.alertBannerText}>
              {!GOOGLE_KEY ? "Add EXPO_PUBLIC_GOOGLE_MAPS_KEY for live results. Showing emergency numbers:" : "Couldn't load live data. Showing emergency numbers:"}
            </Text>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={s.filterRow}>
          {FILTER_TABS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterTab, filter === f.key && { backgroundColor: f.color + "20", borderColor: f.color + "50" }]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon} size={13} color={filter === f.key ? f.color : SUBTEXT} />
              <Text style={[s.filterTabText, filter === f.key && { color: f.color }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={s.loadingText}>Finding nearby help…</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No results found nearby.</Text>
              </View>
            ) : (
              filtered.map((place, i) => (
                <View key={place.id || i} style={s.placeCard}>
                  <View style={[s.placeIcon, { backgroundColor: markerColor(place.type) + "18" }]}>
                    <Ionicons
                      name={place.type === "police" ? "shield" : "medical"}
                      size={18}
                      color={markerColor(place.type)}
                    />
                  </View>
                  <View style={s.placeInfo}>
                    <Text style={s.placeName} numberOfLines={1}>{place.name}</Text>
                    <Text style={s.placeAddress} numberOfLines={1}>{place.address || "Emergency service"}</Text>
                    {place.rating && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="star" size={12} color="#fbbf24" />
                        <Text style={s.placeRating}>{place.rating}</Text>
                        {place.open === true && <><Ionicons name="ellipse" size={8} color="#4ade80" /><Text style={[s.placeRating, { color: "#4ade80" }]}>Open</Text></>}
                        {place.open === false && <><Ionicons name="ellipse" size={8} color="#ef4444" /><Text style={[s.placeRating, { color: "#ef4444" }]}>Closed</Text></>}
                      </View>
                    )}
                  </View>
                  <View style={s.placeActions}>
                    {place.phone && (
                      <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e30" }]} onPress={() => callPlace(place.phone)}>
                        <Ionicons name="call" size={14} color="#22c55e" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: PRIMARY + "18", borderColor: BORDER }]} onPress={() => openMaps(place)}>
                      <Ionicons name="navigate" size={14} color={PRIMARY} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BG },
  map:                { height: 220 },
  mapPlaceholder:     { flex: 1, backgroundColor: "#12082a", alignItems: "center", justifyContent: "center", gap: 8 },
  mapPlaceholderText: { color: "#4b5563", fontSize: 13 },
  sheet:              { flex: 1, padding: 16 },
  sheetHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title:              { fontSize: 20, fontWeight: "800", color: TEXT },
  refreshBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(139,92,246,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  alertBanner:        { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)" },
  alertBannerText:    { flex: 1, color: "#fbbf24", fontSize: 12, lineHeight: 17 },
  filterRow:          { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterTab:          { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.03)" },
  filterTabText:      { fontSize: 12, color: SUBTEXT, fontWeight: "600" },
  loadingBox:         { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText:        { color: SUBTEXT, fontSize: 14 },
  emptyBox:           { alignItems: "center", paddingVertical: 30 },
  emptyText:          { color: SUBTEXT, fontSize: 14 },
  placeCard:          { flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER, gap: 12 },
  placeIcon:          { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  placeInfo:          { flex: 1 },
  placeName:          { fontSize: 13, fontWeight: "700", color: TEXT },
  placeAddress:       { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  placeRating:        { fontSize: 10, color: "#6b7280", marginTop: 2 },
  placeActions:       { flexDirection: "row", gap: 6 },
  actionBtn:          { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
