// App.js — Root Stack + Bottom Tabs (Home, Nearby, Circle, Vault, More)
import { NavigationContainer }                   from "@react-navigation/native";
import { createBottomTabNavigator }              from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator }            from "@react-navigation/native-stack";
import { Ionicons }                              from "@expo/vector-icons";
import { StatusBar }                             from "expo-status-bar";
import { View }                                  from "react-native";
import HomeScreen        from "./screens/HomeScreen";
import SafeRouteScreen   from "./screens/SafeRouteScreen";
import SafeCircleScreen  from "./screens/SafeCircleScreen";
import VaultScreen       from "./screens/VaultScreen";
import AIShieldScreen    from "./screens/AIShieldScreen";
import ProfileScreen     from "./screens/ProfileScreen";
import NearbyScreen      from "./screens/NearbyScreen";
import SafetyLawsScreen  from "./screens/SafetyLawsScreen";
import SelfDefenseScreen from "./screens/SelfDefenseScreen";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── More Hub Screen ──────────────────────────────────────────────────────
import { Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";

function MoreScreen({ navigation }) {
  const ITEMS = [
    { label: "Safe Route",      sub: "AI-powered route safety analysis",    icon: "map",              color: "#8b5cf6", screen: "Route"       },
    { label: "AI Shield",       sub: "Harassment detection & safety chat",   icon: "sparkles",         color: "#ec4899", screen: "AI"          },
    { label: "Safety Laws",     sub: "Know your rights under Indian law",    icon: "library",          color: "#f59e0b", screen: "Laws"        },
    { label: "Self Defense",    sub: "Video guides for self-protection",     icon: "fitness",          color: "#ef4444", screen: "SelfDefense" },
    { label: "My Profile",      sub: "Settings, preferences & quick dials", icon: "person-circle",    color: "#34d399", screen: "Profile"     },
  ];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f0a1e" }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#f1f0f5" }}>More</Text>
        <Text style={{ fontSize: 12, color: "#8b5cf6", marginTop: 4, fontWeight: "600" }}>All ShieldHer features</Text>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#1a1130", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(139,92,246,0.18)" }}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: item.color + "18", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#f1f0f5" }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4b5563" />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Bottom Tab Navigator ─────────────────────────────────────────────────
const TABS = [
  { name: "Home",    component: HomeScreen,      icon: "shield-outline",   activeIcon: "shield"    },
  { name: "Nearby",  component: NearbyScreen,    icon: "location-outline", activeIcon: "location"  },
  { name: "Circle",  component: SafeCircleScreen,icon: "people-outline",   activeIcon: "people"    },
  { name: "Vault",   component: VaultScreen,     icon: "folder-outline",   activeIcon: "folder"    },
  { name: "More",    component: MoreScreen,      icon: "grid-outline",     activeIcon: "grid"      },
];

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   "#a78bfa",
        tabBarInactiveTintColor: "#4b5563",
        tabBarStyle: {
          backgroundColor: "#0a0818",
          borderTopColor: "rgba(139,92,246,0.2)",
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color }) => {
          const tab = TABS.find(t => t.name === route.name);
          return (
            <View style={{
              alignItems: "center", justifyContent: "center",
              ...(focused && {
                backgroundColor: "rgba(139,92,246,0.15)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 4,
              }),
            }}>
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}

// ── Root Stack ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs"    component={TabNavigator}       />
        <Stack.Screen name="Route"       component={SafeRouteScreen}    />
        <Stack.Screen name="AI"          component={AIShieldScreen}     />
        <Stack.Screen name="Laws"        component={SafetyLawsScreen}   />
        <Stack.Screen name="SelfDefense" component={SelfDefenseScreen}  />
        <Stack.Screen name="Profile"     component={ProfileScreen}      />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});
