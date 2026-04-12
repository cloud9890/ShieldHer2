// src/hooks/useToast.js
// Lightweight in-app toast — replaces Alert.alert for non-critical feedback.
// Usage:
//   const { showToast, ToastComponent } = useToast();
//   showToast("Saved successfully", "success");
//   return <View>...<ToastComponent /></View>
import { useState, useRef, useCallback } from "react";
import { Animated, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CONFIGS = {
  success: { icon: "checkmark-circle", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" },
  error:   { icon: "alert-circle",    color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
  info:    { icon: "information-circle", color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.3)" },
  warning: { icon: "warning",          color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)"  },
};

export default function useToast() {
  const [toast, setToast] = useState(null);
  const slideAnim  = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef(null);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, type });

    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim,  { toValue: 0,   useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    timerRef.current = setTimeout(() => dismiss(), duration);
  }, []);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -80, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, []);

  const ToastComponent = () => {
    if (!toast) return null;
    const cfg = CONFIGS[toast.type] || CONFIGS.info;
    return (
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: cfg.bg, borderColor: cfg.border },
          { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        ]}
        pointerEvents="box-none"
      >
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        <Text style={[styles.text, { color: cfg.color }]} numberOfLines={2}>{toast.message}</Text>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color={cfg.color} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return { showToast, ToastComponent };
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  closeBtn: { padding: 2 },
});
