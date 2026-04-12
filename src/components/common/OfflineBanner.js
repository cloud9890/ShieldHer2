// src/components/common/OfflineBanner.js
// Animated offline warning banner — shown at top of screen when no internet
import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useNetworkStatus from "../../hooks/useNetworkStatus";

export default function OfflineBanner() {
  const { isOnline, isChecking } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isChecking) return;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOnline ? -60 : 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isOnline ? 0 : 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOnline, isChecking]);

  if (isOnline && !isChecking) return null;

  return (
    <Animated.View
      style={[s.banner, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline" size={14} color="#fef3c7" />
      <Text style={s.text}>
        You're offline — SOS SMS still works, but AI features are unavailable.
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#92400e",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#b45309",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  text: {
    flex: 1,
    color: "#fef3c7",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
});
