// src/components/vault/EvidenceGrid.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CARD, BORDER, PRIMARY, PINK, SUBTEXT, SUCCESS, WARNING, TEXT } from "../../theme/colors";

export default function EvidenceGrid({ incidents, fetchingRecords, onNew, onSelect, onDelete }) {
  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString("en-IN", { 
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" 
      });
    } catch { return iso; }
  };

  return (
    <View style={s.recordsCard}>
      <View style={s.recordsHeader}>
        <Text style={s.sectionLabel}>SECURE ARCHIVES</Text>
        <TouchableOpacity style={s.addRecordBtn} onPress={onNew}>
          <Ionicons name="add" size={14} color={PINK} />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {fetchingRecords ? (
        <ActivityIndicator color={PRIMARY} style={{ paddingVertical: 20 }} />
      ) : incidents.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={36} color={SUBTEXT} />
          <Text style={s.emptyText}>No records yet</Text>
          <Text style={s.emptySubText}>Your encrypted incident records will appear here</Text>
        </View>
      ) : incidents.map(inc => {
        let _deletePressed = false;
        return (
          <TouchableOpacity
            key={inc.id}
            style={s.recordRow}
            activeOpacity={0.75}
            onPress={() => {
              if (_deletePressed) { _deletePressed = false; return; }
              if (onSelect) onSelect(inc);
            }}
          >
            {inc.media_url ? (
              <Image source={{ uri: inc.media_url }} style={s.recordThumb} />
            ) : (
              <View style={s.recordIcon}>
                <Ionicons name="lock-closed" size={14} color={WARNING} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.recordType}>{inc.type}</Text>
              <Text style={s.recordMeta}>{formatDate(inc.created_at)}</Text>
              {inc.location ? <Text style={s.recordLoc} numberOfLines={1}>📍 {inc.location}</Text> : null}
            </View>
            <View style={s.recordRight}>
              <View style={s.encChip}>
                <Text style={s.encChipText}>Encrypted</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Ionicons name="chevron-forward" size={14} color={SUBTEXT} />
                <TouchableOpacity
                  onPress={() => { _deletePressed = true; if (onDelete) onDelete(inc.id); }}
                  style={s.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color={SUBTEXT} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  recordsCard:        { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, borderWidth: 1, borderColor: BORDER },
  recordsHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionLabel:       { fontSize: 10, color: SUBTEXT, fontWeight: "700", letterSpacing: 1.5 },
  addRecordBtn:       { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(236,72,153,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText:         { color: PINK, fontSize: 12, fontWeight: "600" },
  recordRow:          { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  recordThumb:        { width: 44, height: 44, borderRadius: 10, backgroundColor: CARD },
  recordIcon:         { width: 44, height: 44, backgroundColor: "rgba(251,191,36,0.1)", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recordType:         { fontSize: 13, fontWeight: "600", color: TEXT },
  recordMeta:         { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  recordLoc:          { fontSize: 10, color: SUBTEXT, marginTop: 2 },
  recordRight:        { alignItems: "flex-end", gap: 6 },
  encChip:            { backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  encChipText:        { fontSize: 10, color: SUCCESS, fontWeight: "600" },
  deleteBtn:          { padding: 4 },
  emptyState:         { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText:          { color: SUBTEXT, fontSize: 15, fontWeight: "600" },
  emptySubText:       { color: SUBTEXT, fontSize: 12, textAlign: "center", opacity: 0.6 },
});
