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

const PRIMARY    = "#8b5cf6";
const PILL_BG    = "rgba(10, 10, 18, 0.92)";
const PILL_BORDER = "rgba(139, 92, 246, 0.18)";
const INACTIVE   = "#4b5563";
const PILL_WIDTH = SCREEN_W - 48; // floating with 24px margin each side

const TABS = [
  { name: "Home",   icon: "shield-outline",   activeIcon: "shield"    },
  { name: "Nearby", icon: "location-outline", activeIcon: "location"  },
  { name: "Circle", icon: "people-outline",   activeIcon: "people"    },
  { name: "Vault",  icon: "folder-outline",   activeIcon: "folder"    },
  { name: "More",   icon: "grid-outline",     activeIcon: "grid"      },
];

const TAB_COUNT   = TABS.length;
const TAB_W       = PILL_WIDTH / TAB_COUNT;

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets      = useSafeAreaInsets();
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnims  = useRef(TABS.map(() => new Animated.Value(1))).current;
  const glowAnims   = useRef(TABS.map(() => new Animated.Value(0))).current;

  // Slide the indicator when the active tab changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * TAB_W,
      useNativeDriver: true,
      damping:   18,
      stiffness: 200,
      mass:       0.8,
    }).start();

    // Scale + glow the newly active tab
    TABS.forEach((_, i) => {
      const isActive = i === state.index;
      Animated.spring(scaleAnims[i], {
        toValue: isActive ? 1.15 : 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 260,
      }).start();
      Animated.timing(glowAnims[i], {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
  }, [state.index]);

  return (
    <View
      style={[
        s.outerWrap,
        { bottom: insets.bottom + 12 },
      ]}
      pointerEvents="box-none"
    >
      {/* The frosted pill shell */}
      <View style={s.pill}>

        {/* Sliding purple underline indicator */}
        <Animated.View
          style={[
            s.indicator,
            { transform: [{ translateX: slideAnim }] },
          ]}
        />

        {/* Tab buttons */}
        {state.routes.map((route, index) => {
          const tab       = TABS.find(t => t.name === route.name) || TABS[0];
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

          const iconColor = glowAnims[index].interpolate({
            inputRange:  [0, 1],
            outputRange: [INACTIVE, PRIMARY],
          });

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
              <Animated.View
                style={[
                  s.iconWrap,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                {/* Glow halo behind active icon */}
                {isFocused && (
                  <View style={s.glowHalo} />
                )}
                <Animated.Text style={{ color: iconColor }}>
                  <Ionicons
                    name={isFocused ? tab.activeIcon : tab.icon}
                    size={22}
                    color={isFocused ? PRIMARY : INACTIVE}
                  />
                </Animated.Text>
              </Animated.View>
              <Text
                style={[
                  s.label,
                  isFocused ? s.labelActive : s.labelInactive,
                ]}
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
    // Elevate visually above everything else
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
    justifyContent: "space-around",
    overflow: "hidden",
    // Soft purple shadow for depth/spatial feel
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    // Android depth
    ...(Platform.OS === "android" && {
      elevation: 20,
    }),
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: TAB_W,
    height: 2,
    backgroundColor: PRIMARY,
    borderRadius: 2,
    shadowColor: PRIMARY,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
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
    position: "relative",
  },
  glowHalo: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  label: {
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: PRIMARY,
  },
  labelInactive: {
    color: INACTIVE,
  },
});
