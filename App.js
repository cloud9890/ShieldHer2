// App.js — Root Stack + 5 Bottom Tabs + Swipe Navigation + Back Buttons
import { useState, useEffect, useRef } from "react";
import { View, PanResponder, ActivityIndicator } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator }     from "@react-navigation/bottom-tabs";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator }   from "@react-navigation/native-stack";
import { Ionicons }                     from "@expo/vector-icons";
import { StatusBar }                    from "expo-status-bar";

import HomeScreen        from "./screens/HomeScreen";
import SafeRouteScreen   from "./screens/SafeRouteScreen";
import SafeCircleScreen  from "./screens/SafeCircleScreen";
import VaultScreen       from "./screens/VaultScreen";
import AIShieldScreen    from "./screens/AIShieldScreen";
import ProfileScreen     from "./screens/ProfileScreen";
import NearbyScreen      from "./screens/NearbyScreen";
import SafetyLawsScreen  from "./screens/SafetyLawsScreen";
import SelfDefenseScreen from "./screens/SelfDefenseScreen";
import MoreScreen        from "./screens/MoreScreen";
import LoginScreen       from "./screens/LoginScreen";

import { supabase } from "./services/supabase";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Navigation ref for programmatic navigation (used by swipe)
const navigationRef = createNavigationContainerRef();

// ── Tab order for swipe gestures ─────────────────────────────────────────
const TAB_ORDER = ["Home", "Nearby", "Circle", "Vault", "More"];

// ── Dark header options for sub-screens (adds back button) ───────────────
const DARK_HEADER = (title) => ({
  headerShown: true,
  title,
  headerStyle: {
    backgroundColor: "#0f0a1e",
  },
  headerTintColor: "#a78bfa",
  headerTitleStyle: {
    color: "#f1f0f5",
    fontWeight: "700",
    fontSize: 17,
  },
  headerShadowVisible: false,
  headerBackTitle: "More",
});

// ── Bottom Tab Navigator ─────────────────────────────────────────────────
const TABS = [
  { name: "Home",   component: HomeScreen,      icon: "shield-outline",   activeIcon: "shield"    },
  { name: "Nearby", component: NearbyScreen,    icon: "location-outline", activeIcon: "location"  },
  { name: "Circle", component: SafeCircleScreen,icon: "people-outline",   activeIcon: "people"    },
  { name: "Vault",  component: VaultScreen,     icon: "folder-outline",   activeIcon: "folder"    },
  { name: "More",   component: MoreScreen,      icon: "grid-outline",     activeIcon: "grid"      },
];

// ── Animated swipe tab navigator ────────────────────────────────────────────
// Using createMaterialTopTabNavigator for real ViewPager swipe animations.
// We position it at the bottom by flipping the layout.
function TabNavigator() {
  const Tab = createMaterialTopTabNavigator();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   "#a78bfa",
        tabBarInactiveTintColor: "#4b5563",
        tabBarStyle: {
          backgroundColor: "#0a0818",
          borderTopColor:  "rgba(139,92,246,0.2)",
          borderTopWidth:  1,
          height:          65,
          paddingBottom:   10,
          paddingTop:      6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
        tabBarIndicatorStyle: { height: 0 },
        tabBarIcon: ({ focused, color }) => {
          const tab = TABS.find(t => t.name === route.name);
          return (
            <View style={{
              alignItems: "center", justifyContent: "center",
              ...(focused && {
                backgroundColor: "rgba(139,92,246,0.15)",
                borderRadius:    12,
                paddingHorizontal: 14,
                paddingVertical:   4,
              }),
            }}>
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={22} color={color} />
            </View>
          );
        },
        // Animate tab switches with a slide transition
        animationEnabled: true,
        lazy: true,
      })}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentTabRef = useRef("Home");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Swipe-between-tabs with PanResponder
  const swipePan = useRef(
    PanResponder.create({
      // Only capture very horizontal, fast swipes
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2.5 && Math.abs(gs.vx) > 0.3,
      onPanResponderRelease: (_, gs) => {
        // Only swipe when on a tab (not inside a stack sub-screen)
        const idx = TAB_ORDER.indexOf(currentTabRef.current);
        if (idx === -1) return; // inside sub-screen — don't interfere

        if (gs.dx < -60 && idx < TAB_ORDER.length - 1) {
          // Swipe left → next tab
          navigationRef.current?.navigate(TAB_ORDER[idx + 1]);
        } else if (gs.dx > 60 && idx > 0) {
          // Swipe right → previous tab
          navigationRef.current?.navigate(TAB_ORDER[idx - 1]);
        }
      },
    })
  ).current;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f0a1e", justifyContent: "center" }}>
        <ActivityIndicator color="#8b5cf6" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...swipePan.panHandlers}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          if (!session) return;
          if (navigationRef.isReady()) {
            const name = navigationRef.getCurrentRoute()?.name;
            if (name && TAB_ORDER.includes(name)) {
              currentTabRef.current = name;
            }
          }
        }}
      >
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              {/* Main tab view */}
              <Stack.Screen name="MainTabs"    component={TabNavigator} />

              {/* Sub-screens accessible from More hub — all have back buttons */}
              <Stack.Screen name="Route"       component={SafeRouteScreen}   options={DARK_HEADER("Safe Route")}     />
              <Stack.Screen name="AI"          component={AIShieldScreen}    options={DARK_HEADER("AI Shield")}      />
              <Stack.Screen name="Laws"        component={SafetyLawsScreen}  options={DARK_HEADER("Safety Laws")}    />
              <Stack.Screen name="SelfDefense" component={SelfDefenseScreen} options={DARK_HEADER("Self Defense")}   />
              <Stack.Screen name="Profile"     component={ProfileScreen}     options={DARK_HEADER("My Profile")}     />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
