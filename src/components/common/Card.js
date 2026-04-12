// src/components/common/Card.js
// Reusable glass card with consistent ShieldHer styling
import React from "react";
import { View, StyleSheet } from "react-native";
import { CARD, BORDER } from "../../theme/colors";

export default function Card({ children, style, noPadding }) {
  return (
    <View style={[s.card, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
});
