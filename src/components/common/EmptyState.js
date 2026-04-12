// src/components/common/EmptyState.js
// Reusable empty state indicator
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SUBTEXT } from "../../theme/colors";

export default function EmptyState({ icon = "folder-open-outline", title, subtitle, size = 36 }) {
  return (
    <View style={s.container}>
      <Ionicons name={icon} size={size} color={SUBTEXT} />
      {title && <Text style={s.title}>{title}</Text>}
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 28, gap: 8 },
  title:     { color: SUBTEXT, fontSize: 15, fontWeight: "600" },
  subtitle:  { color: SUBTEXT, fontSize: 12, textAlign: "center", opacity: 0.6, maxWidth: 220 },
});
