// src/components/common/SectionLabel.js
// Reusable uppercase section label
import React from "react";
import { Text, StyleSheet } from "react-native";
import { SUBTEXT } from "../../theme/colors";

export default function SectionLabel({ children, style }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  label: {
    fontSize: 10,
    color: SUBTEXT,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
});
