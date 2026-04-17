// src/components/vault/IntakeModalities.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CARD, BORDER, PRIMARY, PINK, WARNING, SUBTEXT } from "../../theme/colors";

export default function IntakeModalities({ onPhoto, onUpload, onDoc, onGPS }) {
  return (
    <View style={s.captureCard}>
      <Text style={s.sectionLabel}>INTAKE MODALITIES</Text>
      <View style={s.captureRow}>
        {[
          { icon: "camera",        label: "Camera",  color: PRIMARY, action: onPhoto },
          { icon: "images",        label: "Upload",  color: PINK,    action: onUpload },
          { icon: "document-text", label: "Doc",     color: "#06b6d4", action: onDoc },
          { icon: "location",      label: "GPS",     color: WARNING, action: onGPS },
        ].map(b => (
          <TouchableOpacity 
            key={b.label} 
            style={[s.captureBtn, { backgroundColor: b.color + "18", borderColor: b.color + "40" }]}
            onPress={b.action}
          >
            <Ionicons name={b.icon} size={22} color={b.color} />
            <Text style={[s.captureBtnText, { color: b.color }]}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  captureCard:        { marginHorizontal: 16, marginBottom: 14, backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER },
  sectionLabel:       { fontSize: 10, color: SUBTEXT, fontWeight: "700", letterSpacing: 1.5, marginBottom: 14 },
  captureRow:         { flexDirection: "row", gap: 8 },
  captureBtn:         { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", gap: 6 },
  captureBtnText:     { fontSize: 11, fontWeight: "600" },
});
