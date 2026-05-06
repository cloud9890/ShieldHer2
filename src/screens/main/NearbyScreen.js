// src/screens/NearbyScreen.js
// Map-First Premium Redesign - Phase 3 & 5

import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Animated, Dimensions, ActivityIndicator,
  Linking, Platform, Modal, PanResponder
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { BG, PRIMARY, SUBTEXT, TEXT, BORDER, CARD, WARNING, DANGER, SUCCESS } from "../../theme/colors";
import useCommunityReports from "../../hooks/useCommunityReports";
import { getTypeMeta, EMERGENCY_NUMBERS, INCIDENT_TYPES } from "../../components/map/incidentMeta";
import { summariseReport, getEscapeAdvice } from "../../api/gemini";

let MapView, Marker, PROVIDER_GOOGLE, Circle;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

const { height } = Dimensions.get("window");
const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

// ── Helpers ─────────────────────────────────────────────────────────────────
const darkMapStyle = [
  {"elementType":"geometry","stylers":[{"color":"#242f3e"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#746855"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#242f3e"}]},
  {"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#d59563"}]},
  {"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#d59563"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#263c3f"}]},
  {"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#6b9a76"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#38414e"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#212a37"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#9ca5b3"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#746855"}]},
  {"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#1f2835"}]},
  {"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#f3d19c"}]},
  {"featureType":"transit","elementType":"geometry","stylers":[{"color":"#2f3948"}]},
  {"featureType":"transit.station","elementType":"labels.text.fill","stylers":[{"color":"#d59563"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#17263c"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#515c6d"}]},
  {"featureType":"water","elementType":"labels.text.stroke","stylers":[{"color":"#17263c"}]}
];

function haversineDistStr(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "";
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon1 - lon2) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 1 ? (d * 1000).toFixed(0) + " m" : d.toFixed(1) + " km";
}

// ── Components ──────────────────────────────────────────────────────────────

function MarkerBubble({ type, size = 44 }) {
  const meta = getTypeMeta(type);
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: meta.color,
        alignItems: "center", justifyContent: "center", shadowColor: meta.color,
        shadowOpacity: 0.6, shadowRadius: 8, elevation: 6,
      }}>
        <Ionicons name={meta.icon} size={size * 0.42} color="white" />
      </View>
      <View style={{
        width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5,
        borderTopWidth: 8, borderLeftColor: "transparent", borderRightColor: "transparent",
        borderTopColor: meta.color, marginTop: -1,
      }} />
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function NearbyScreen() {
  const [location, setLocation] = useState(null);
  const [places, setPlaces]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [radiusKm, setRadiusKm] = useState(5);
  
  // Sheet drag state
  const sheetY     = useRef(new Animated.Value(height * 0.55)).current; // Start partially open
  const mapRef     = useRef(null);
  const listRef    = useRef(null);

  const [selectedPlace, setSelectedPlace] = useState(null); // Place Modals
  const [reportDetail, setReportDetail]   = useState(null); // AI Report Summary Modal

  const { reports } = useCommunityReports(10); // Real SUPABASE reports

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
    onPanResponderMove: Animated.event([null, { dy: sheetY }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gestureState) => {
      const isUp = gestureState.vy < -0.5 || gestureState.dy < -50;
      Animated.spring(sheetY, {
        toValue: isUp ? 60 : height * 0.55, 
        useNativeDriver: false, friction: 8
      }).start();
    }
  })).current;

  // Init Location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLoading(false); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc.coords);
        if (GOOGLE_KEY) await fetchPlaces(loc.coords.latitude, loc.coords.longitude, radiusKm);
      } catch (e) {
        setLoading(false);
      }
    })();
  }, [radiusKm]); // Re-fetch on radius change

  const fetchPlaces = async (lat, lng, rad) => {
    setLoading(true);
    try {
      const pUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${rad*1000}&type=police&key=${GOOGLE_KEY}`;
      const hUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${rad*1000}&type=hospital&key=${GOOGLE_KEY}`;
      
      const [pRes, hRes] = await Promise.all([fetch(pUrl), fetch(hUrl)]);
      const [pData, hData] = await Promise.all([pRes.json(), hRes.json()]);

      const combined = [
        ...(pData.results||[]).map(p => ({ ...p, _type: "police" })),
        ...(hData.results||[]).map(h => ({ ...h, _type: "hospital" }))
      ];

      // Fix 3: Detail fetches for real phone numbers (Limit to top 10 to save API calls)
      const enhanced = await Promise.all(combined.slice(0, 10).map(async (item) => {
        let phone = null;
        try {
          const detailRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=formatted_phone_number&key=${GOOGLE_KEY}`);
          const detailData = await detailRes.json();
          phone = detailData.result?.formatted_phone_number;
        } catch(e){}

        return {
          id: item.place_id,
          name: item.name,
          address: item.vicinity,
          type: item._type,
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
          phone: phone,
          rating: item.rating,
          open: item.opening_hours?.open_now,
          dist: haversineDistStr(lat, lng, item.geometry.location.lat, item.geometry.location.lng)
        };
      }));

      setPlaces(enhanced);
    } catch {
      // Fallback
    }
    setLoading(false);
  };

  // Fix 1: Geocoding Search
  const performSearch = async () => {
    if (!search.trim() || !GOOGLE_KEY) return;
    setLoading(true);
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(search)}&key=${GOOGLE_KEY}`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      if (data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
        await fetchPlaces(lat, lng, radiusKm);
      }
    } catch (e) {
      console.log("Search error", e);
    }
    setLoading(false);
  };

  // Fix 5: Marker sync
  const onMarkerTap = (item, index) => {
    setSelectedPlace(item);
  };

  const onReportTap = async (item) => {
    // AI-2: Report Summariser
    setReportDetail({ ...item, aiLoading: true });
    try {
      const aiReply = await summariseReport(item.category, item.note, new Date(item.created_at).toLocaleString());
      if (aiReply) setReportDetail({ ...item, aiSummary: aiReply, aiLoading: false });
      else setReportDetail({ ...item, aiLoading: false, aiError: true });
    } catch {
      setReportDetail({ ...item, aiLoading: false, aiError: true });
    }
  };

  const onEscapeAdvice = async () => {
    // AI-3: Escape Route Advisor
    if (!selectedPlace) return;
    setSelectedPlace(prev => ({ ...prev, aiLoading: true }));
    try {
      const placesSubset = places.slice(0, 5).map(p => p.name);
      const advice = await getEscapeAdvice(placesSubset, new Date().toLocaleTimeString());
      setSelectedPlace(prev => ({ ...prev, advice, aiLoading: false }));
    } catch {
      setSelectedPlace(prev => ({ ...prev, aiLoading: false }));
    }
  };

  // Fix 2: Filter markers
  const filteredPlaces = filter === "all" ? places : places.filter(p => p.type === filter);
  const filteredReports = filter === "all" ? reports : reports.filter(r => getTypeMeta(r.category).key === filter);

  return (
    <View style={s.container}>
      {/* ── BACKGROUND MAP ───────────────────────────────────────────────────── */}
      {Platform.OS === "web" ? (
        <View style={{ flex: 1, backgroundColor: CARD, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: SUBTEXT }}>Map unavailable on Web</Text>
        </View>
      ) : MapView && location ? (
        <MapView 
          ref={mapRef}
          style={StyleSheet.absoluteFillObject} 
          customMapStyle={darkMapStyle}
          initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
          showsUserLocation
        >
          {location && <Circle center={location} radius={radiusKm * 1000} fillColor="rgba(139,92,246,0.1)" strokeColor="rgba(139,92,246,0.3)" />}
          
          {/* Places Markers */}
          {filteredPlaces.map((p, i) => (
            <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={() => onMarkerTap(p, i)}>
              <MarkerBubble type={p.type} />
            </Marker>
          ))}

          {/* Report Markers */}
          {filteredReports.map((r, i) => {
            const tKey = getTypeMeta(r.category).key;
            return (
              <Marker key={`rep_${i}`} coordinate={{ latitude: r.latitude, longitude: r.longitude }} onPress={() => onReportTap(r)}>
                <MarkerBubble type={tKey} size={36} />
              </Marker>
            );
          })}
        </MapView>
      ) : null}

      {/* ── TOP SEARCH OVERLAY ────────────────────────────────────────────────── */}
      <View style={s.topOverlay}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={20} color={SUBTEXT} />
          <TextInput 
            style={s.searchInput} 
            value={search} onChangeText={setSearch} 
            placeholder="Search location..." placeholderTextColor={SUBTEXT} 
            onSubmitEditing={performSearch}
          />
        </View>
        <TouchableOpacity style={s.recenterBtn} onPress={() => {
           if(location) mapRef.current?.animateToRegion({ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 1000);
        }}>
          <Ionicons name="locate" size={20} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* ── SOS QUICK DIAL STRIP ────────────────────────────────────────────── */}
      <View style={s.sosStrip}>
        {EMERGENCY_NUMBERS.map(e => (
          <TouchableOpacity key={e.number} style={[s.sosBtn, { borderColor: e.color + "40", backgroundColor: CARD }]} onPress={() => Linking.openURL(`tel:${e.number}`)}>
            <Ionicons name={e.icon} size={14} color={e.color} />
            <Text style={{ color: TEXT, fontSize: 11, fontWeight: "700" }}>{e.number}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── DRAGGABLE BOTTOM SHEET ──────────────────────────────────────────── */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]}>
        <View {...panResponder.panHandlers} style={s.sheetHandleWrap}>
          <View style={s.sheetHandle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          
          {/* Radius Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {[1, 5, 10, 20].map(rad => (
               <TouchableOpacity key={rad} style={[s.chip, radiusKm === rad && s.chipActive]} onPress={() => setRadiusKm(rad)}>
                 <Text style={[s.chipText, radiusKm === rad && s.chipTextActive]}>{rad} km</Text>
               </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Filter Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipScroll, { marginTop: 12 }]} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => setFilter("all")} style={[s.chip, filter === "all" && s.chipActive]}>
              <Text style={[s.chipText, filter === "all" && s.chipTextActive]}>All Nearby</Text>
            </TouchableOpacity>
            {INCIDENT_TYPES.map(f => (
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && s.chipActive]}>
                <Ionicons name={f.icon} size={14} color={filter === f.key ? PRIMARY : SUBTEXT} />
                <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Results List */}
          <View style={{ marginTop: 16, paddingHorizontal: 16, gap: 12 }}>
            {loading ? <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} /> : null}
            {!loading && filteredPlaces.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setSelectedPlace(p)}>
                <View style={[s.placeCard, { borderLeftColor: getTypeMeta(p.type).color, borderLeftWidth: 3 }]}>
                  <View style={[s.placeIconWrap, { backgroundColor: getTypeMeta(p.type).color + "18" }]}>
                    <Ionicons name={getTypeMeta(p.type).icon} size={20} color={getTypeMeta(p.type).color} />
                  </View>
                  <View style={s.placeInfo}>
                    <Text style={s.placeName} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.placeAddr} numberOfLines={1}>{p.address || "Emergency service"}</Text>
                    {p.rating && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Ionicons name="star" size={11} color="#fbbf24" />
                        <Text style={s.placeRating}>{p.rating}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.placeActions}>
                    <Text style={{ color: SUBTEXT, fontSize: 11 }}>{p.dist}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── PLACE DETAIL MODAL ──────────────────────────────────────────────── */}
      <Modal visible={!!selectedPlace} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {selectedPlace && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{selectedPlace.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedPlace(null)}>
                    <Ionicons name="close" size={24} color={TEXT} />
                  </TouchableOpacity>
                </View>
                <Text style={{color:SUBTEXT, marginBottom: 16}}>{selectedPlace.address}</Text>
                
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                  {selectedPlace.phone && (
                    <TouchableOpacity style={[s.mBtn, { backgroundColor: SUCCESS + "18", borderColor: SUCCESS }]} onPress={() => Linking.openURL(`tel:${selectedPlace.phone}`)}>
                      <Ionicons name="call" size={18} color={SUCCESS} />
                      <Text style={[s.mBtnText, { color: SUCCESS }]}>Call</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.mBtn, { backgroundColor: PRIMARY + "18", borderColor: PRIMARY }]} onPress={() => Linking.openURL(`geo:0,0?q=${selectedPlace.lat},${selectedPlace.lng}`)}>
                    <Ionicons name="navigate" size={18} color={PRIMARY} />
                    <Text style={[s.mBtnText, { color: PRIMARY }]}>Navigate</Text>
                  </TouchableOpacity>
                </View>

                {/* AI-3 Escape Advisor Trigger */}
                {!selectedPlace.advice ? (
                  <TouchableOpacity style={s.dangerBtn} onPress={onEscapeAdvice}>
                    {selectedPlace.aiLoading ? <ActivityIndicator size="small" color={DANGER} /> : (
                      <>
                        <Ionicons name="warning" size={18} color={DANGER} />
                        <Text style={s.dangerBtnText}>I feel unsafe here</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={s.adviceBox}>
                    <View style={s.aiHeader}><Ionicons name="sparkles" size={14} color={WARNING}/><Text style={s.aiTitle}>AI Escape Advice</Text></View>
                    {(selectedPlace.advice.steps || []).map((step, i) => (
                      <Text key={i} style={s.adviceStep}>{i+1}. {step}</Text>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── REPORT SUMMARY MODAL ────────────────────────────────────────────── */}
      <Modal visible={!!reportDetail} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { borderColor: reportDetail ? getTypeMeta(reportDetail.category).color : BORDER }]}>
            {reportDetail && (
              <>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{getTypeMeta(reportDetail.category).label}</Text>
                  <TouchableOpacity onPress={() => setReportDetail(null)}>
                    <Ionicons name="close" size={24} color={TEXT} />
                  </TouchableOpacity>
                </View>
                <Text style={{color:TEXT, fontSize:15, marginBottom: 12}}>{reportDetail.note}</Text>
                <Text style={{color:SUBTEXT, fontSize:12, marginBottom: 16}}>Reported: {new Date(reportDetail.created_at).toLocaleString()}</Text>

                {/* AI-2 Report Summary */}
                <View style={s.adviceBox}>
                  <View style={s.aiHeader}><Ionicons name="sparkles" size={14} color={WARNING}/><Text style={s.aiTitle}>AI Summary</Text></View>
                  {reportDetail.aiLoading ? <ActivityIndicator color={WARNING} /> : reportDetail.aiSummary ? (
                    <>
                      <Text style={{color: TEXT, fontWeight: '700', marginBottom: 4}}>Risk: <Text style={{color: reportDetail.aiSummary.risk === 'high' ? DANGER : WARNING}}>{(reportDetail.aiSummary.risk || "").toUpperCase()}</Text></Text>
                      <Text style={s.adviceStep}>{reportDetail.aiSummary.summary}</Text>
                      <Text style={[s.adviceStep, {marginTop: 6, color: WARNING}]}>Tip: {reportDetail.aiSummary.advice}</Text>
                    </>
                  ) : <Text style={s.adviceStep}>Summary unavailable.</Text>}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topOverlay: { position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row", gap: 10, zIndex: 10 },
  searchBox: { flex: 1, backgroundColor: CARD, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, marginLeft: 8, color: TEXT, fontSize: 15 },
  recenterBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: CARD, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  sosStrip: { position: "absolute", top: 110, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  sosBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: height * 0.85, backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: BORDER },
  sheetHandleWrap: { width: "100%", height: 30, alignItems: "center", justifyContent: "center" },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: BORDER },
  chipScroll: { maxHeight: 36 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: "rgba(139,92,246,0.15)", borderColor: PRIMARY },
  chipText: { color: SUBTEXT, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: PRIMARY, fontWeight: "600" },
  placeCard: { flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12 },
  placeIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  placeInfo: { flex: 1, marginLeft: 12 },
  placeName: { fontSize: 15, fontWeight: "700", color: TEXT },
  placeAddr: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  placeRating: { fontSize: 11, color: SUBTEXT },
  placeActions: { alignItems: "flex-end" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: BORDER },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  mBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 44, borderRadius: 12, borderWidth: 1, gap: 6 },
  mBtnText: { fontWeight: "700", fontSize: 14 },
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 12, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", gap: 8 },
  dangerBtnText: { color: DANGER, fontWeight: "700" },
  adviceBox: { backgroundColor: "rgba(251,191,36,0.08)", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  aiTitle: { color: WARNING, fontWeight: "700", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  adviceStep: { color: TEXT, fontSize: 14, lineHeight: 22 }
});
