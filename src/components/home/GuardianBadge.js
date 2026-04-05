// src/components/home/GuardianBadge.js
import React from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { CARD, BORDER, TEXT, SUCCESS, MUTED } from "../../theme/colors";

export default function GuardianBadge({ guardianOn, onPress, pulseAnim }) {
  return (
    <TouchableOpacity style={s.guardianCard} onPress={onPress} activeOpacity={0.8}>
      <View style={s.guardianLeft}>
        <Animated.View style={[
          s.guardianDot,
          { backgroundColor: guardianOn ? SUCCESS : MUTED, transform: guardianOn ? [{ scale: pulseAnim }] : [] }
        ]} />
        <View>
          <Text style={s.guardianLabel}>Guardian Mode</Text>
          <Text style={[s.guardianStatus, { color: guardianOn ? SUCCESS : MUTED }]}>
            {guardianOn ? "Active & Monitoring" : "Tap to enable"}
          </Text>
        </View>
      </View>
      <View style={[s.guardianToggle, { backgroundColor: guardianOn ? SUCCESS : "#374151" }]}>
        <View style={[s.guardianThumb, { alignSelf: guardianOn ? "flex-end" : "flex-start" }]} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  guardianCard:   { marginHorizontal: 16, marginTop: 16, backgroundColor: CARD, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BORDER },
  guardianLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  guardianDot:    { width: 10, height: 10, borderRadius: 5 },
  guardianLabel:  { color: TEXT, fontSize: 14, fontWeight: "700" },
  guardianStatus: { fontSize: 11, marginTop: 1 },
  guardianToggle: { width: 40, height: 22, borderRadius: 11, padding: 2, justifyContent: "center" },
  guardianThumb:  { width: 18, height: 18, borderRadius: 9, backgroundColor: "white" },
});
