// src/navigation/FloatingTabBar.js
// Dynamic Island — frosted-glass floating pill navigation
import React, { useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const PRIMARY = "#8b5cf6";
const PILL_BG = "rgba(10, 10, 18, 0.92)";
const PILL_BORDER = "rgba(139, 92, 246, 0.18)";
const INACTIVE = "#4b5563";
const PILL_WIDTH = Math.min(SCREEN_W - 48, 500); // cap for web wide-screen

const TABS = [
  { name: "Home", icon: "shield-outline", activeIcon: "shield" },
  { name: "Nearby", icon: "location-outline", activeIcon: "location" },
  { name: "Circle", icon: "people-outline", activeIcon: "people" },
  { name: "Vault", icon: "folder-outline", activeIcon: "folder" },
  { name: "More", icon: "grid-outline", activeIcon: "grid" },
];

const TAB_W = PILL_WIDTH / TABS.length;

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  // Indicator slide — JS driver (works on both native and web)
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Scale per tab — JS driver (useNativeDriver conflicts with some web envs)
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Slide the underline indicator to the active tab
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_W,
      useNativeDriver: false, // false = works on web AND native
      damping: 18,
      stiffness: 200,
      mass: 0.8,
    }).start();

    // Spring-scale the active icon up, rest down
    TABS.forEach((_, i) => {
      const isActive = i === state.index;
      Animated.spring(scaleAnims[i], {
        toValue: isActive ? 1.15 : 1,
        useNativeDriver: false,
        damping: 14,
        stiffness: 260,
      }).start();
    });
  }, [state.index]);

  return (
    <View
      style={[s.outerWrap, { bottom: (insets.bottom || 0) + 12 }]}
      pointerEvents="box-none"
    >
      <View style={s.pill}>

        {/* Sliding purple underline indicator */}
        <Animated.View
          style={[s.indicator, { left: slideAnim }]}
        />

        {/* Tab buttons */}
        {state.routes.map((route, index) => {
          const tab = TABS.find(t => t.name === route.name) || TABS[0];
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={s.tabBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isFocused }}
            >
              {/* Icon wrapper with spring scale */}
              <Animated.View
                style={[
                  s.iconWrap,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                {/* Glow halo behind active icon */}
                {isFocused && <View style={s.glowHalo} />}

                {/* Icon — colour toggled by state, not Animated (avoids web crash) */}
                <Ionicons
                  name={isFocused ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isFocused ? PRIMARY : INACTIVE}
                />
                {/* Label */}
                <Text
                  style={[s.label, isFocused ? s.labelActive : s.labelInactive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
    elevation: 30,
  },
  pill: {
    width: PILL_WIDTH,
    height: 66,
    backgroundColor: PILL_BG,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: PRIMARY,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === "android" ? 20 : undefined,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    width: TAB_W,
    height: 2.5,
    backgroundColor: PRIMARY,
    borderRadius: 2,
    shadowColor: PRIMARY,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 3,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
  },
  glowHalo: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(139, 92, 246, 0.14)",
  },
  label: {
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  labelActive: { color: PRIMARY },
  labelInactive: { color: INACTIVE },
});
