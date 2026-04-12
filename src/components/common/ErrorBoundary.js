// src/components/common/ErrorBoundary.js
// Global error boundary — catches render crashes and shows friendly fallback
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Ionicons name="warning-outline" size={56} color="#f87171" />
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.subtitle}>
            The app encountered an unexpected error. Please restart.
          </Text>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={s.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  title:    { fontSize: 22, fontWeight: "800", color: "#f0f6fc" },
  subtitle: { fontSize: 14, color: "#8b949e", textAlign: "center", lineHeight: 22 },
  btn:      { backgroundColor: "#8b5cf6", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 32, marginTop: 10 },
  btnText:  { color: "white", fontWeight: "700", fontSize: 14 },
});
