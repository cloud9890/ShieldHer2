// src/components/home/SOSButton.js
import React from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { DANGER } from "../../theme/colors";

export default function SOSButton({ 
  onPressIn, 
  onPressOut, 
  glowAnim, 
  pressProgress 
}) {
  const ringColor = pressProgress.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ["rgba(239,68,68,0)", "rgba(239,68,68,0.35)"] 
  });
  
  const ringWidth = pressProgress.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ["0%", "100%"] 
  });

  return (
    <View style={s.sosSection}>
      <View style={s.sosRingOuter}>
        <Animated.View style={[s.sosRingMid, { opacity: glowAnim }]} />
        <View style={s.sosRing}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: ringColor, borderRadius: 999 }]} />
          <TouchableOpacity 
            style={s.sosBtn} 
            onPressIn={onPressIn} 
            onPressOut={onPressOut} 
            activeOpacity={0.9}
          >
            <Text style={s.sosBtnLabel}>SOS</Text>
            <Text style={s.sosBtnSub}>Hold 3s</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={s.sosProgressTrack}>
        <Animated.View style={[s.sosProgressFill, { width: ringWidth }]} />
      </View>
      <Text style={s.sosHint}>Hold to send emergency alert to your contacts</Text>
    </View>
  );
}

const s = StyleSheet.create({
  sosSection:       { alignItems: "center", paddingVertical: 32 },
  sosRingOuter:     { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  sosRingMid:       { position: "absolute", width: 196, height: 196, borderRadius: 98, backgroundColor: "rgba(239,68,68,0.06)", borderWidth: 2, borderColor: "rgba(239,68,68,0.2)" },
  sosRing:          { width: 164, height: 164, borderRadius: 82, borderWidth: 3, borderColor: "rgba(239,68,68,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sosBtn:           { width: 148, height: 148, borderRadius: 74, backgroundColor: DANGER, alignItems: "center", justifyContent: "center" },
  sosBtnLabel:      { color: "white", fontSize: 32, fontWeight: "900" },
  sosBtnSub:        { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
  sosProgressTrack: { width: 220, height: 4, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 2, marginTop: 14 },
  sosProgressFill:  { height: 4, backgroundColor: DANGER, borderRadius: 2 },
  sosHint:          { fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 10 },
});
