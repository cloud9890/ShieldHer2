// src/components/map/MapElements.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY, SUBTEXT, TEXT, BORDER, CARD } from "../../theme/colors";
import { getTypeMeta } from "./incidentMeta";

export function MarkerBubble({ type, size = 44 }) {
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
      <View style={{
        width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5,
        borderTopWidth: 8, borderLeftColor: "transparent",
        borderRightColor: "transparent", borderTopColor: meta.color,
        marginTop: -1,
      }} />
    </View>
  );
}

export function IncidentCard({ item, onPress }) {
  const meta = getTypeMeta(item.type);
  return (
    <TouchableOpacity
      style={[s.incCard, { borderColor: meta.color + "50", backgroundColor: meta.bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={s.incCardHeader}>
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[s.incCardCategory, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <Text style={s.incCardTitle}>{item.name || item.label}</Text>
      {item.dist && <Text style={s.incCardDist}>{item.dist} away</Text>}
      <View style={s.incCardFooter}>
        <Text style={s.incCardAgo}>Reported {item.ago || "just now"}</Text>
        <View style={[s.viewBtn, { borderColor: meta.color + "60" }]}>
          <Text style={[s.viewBtnText, { color: meta.color }]}>View</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function PlaceCard({ place, onCall, onNavigate }) {
  const meta = getTypeMeta(place.type);
  return (
    <View style={[s.placeCard, { borderLeftColor: meta.color, borderLeftWidth: 3 }]}>
      <View style={[s.placeIconWrap, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={s.placeInfo}>
        <Text style={s.placeName} numberOfLines={1}>{place.name}</Text>
        <Text style={s.placeAddr} numberOfLines={1}>{place.address || "Emergency service"}</Text>
        {place.rating ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="star" size={11} color="#fbbf24" />
            <Text style={s.placeRating}>{place.rating}</Text>
            {place.open === true && <Text style={[s.placeRating, { color: "#4ade80" }]}>· Open</Text>}
            {place.open === false && <Text style={[s.placeRating, { color: "#ef4444" }]}>· Closed</Text>}
          </View>
        ) : null}
      </View>
      <View style={s.placeActions}>
        {place.phone && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#22c55e18", borderColor: "#22c55e30" }]}
            onPress={() => onCall(place.phone)}>
            <Ionicons name="call" size={14} color="#22c55e" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: PRIMARY + "18", borderColor: BORDER }]}
          onPress={() => onNavigate?.(place)}>
          <Ionicons name="navigate" size={14} color={PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  incCard: { width: 180, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4, backgroundColor: "rgba(26,17,48,0.8)" },
  incCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  incCardCategory: { fontSize: 11, fontWeight: "700" },
  incCardTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  incCardDist: { fontSize: 11, color: SUBTEXT },
  incCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  incCardAgo: { fontSize: 10, color: "#4b5563" },
  viewBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  viewBtnText: { fontSize: 11, fontWeight: "700" },

  placeCard: { flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 16, padding: 12, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER, gap: 12 },
  placeIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  placeInfo: { flex: 1 },
  placeName: { fontSize: 13, fontWeight: "700", color: TEXT },
  placeAddr: { fontSize: 11, color: SUBTEXT, marginTop: 2 },
  placeRating: { fontSize: 11, color: "#6b7280" },
  placeActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
