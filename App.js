// App.js
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import SafeRouteScreen from "./screens/SafeRouteScreen";
import SafeCircleScreen from "./screens/SafeCircleScreen";
import VaultScreen from "./screens/VaultScreen";
import AIShieldScreen from "./screens/AIShieldScreen";

const Tab = createBottomTabNavigator();

const TABS = [
  { name: "Home",   component: HomeScreen,       icon: "shield-outline",        activeIcon: "shield"         },
  { name: "Route",  component: SafeRouteScreen,  icon: "map-outline",           activeIcon: "map"            },
  { name: "Circle", component: SafeCircleScreen, icon: "people-outline",        activeIcon: "people"         },
  { name: "Vault",  component: VaultScreen,       icon: "folder-outline",        activeIcon: "folder"         },
  { name: "AI",     component: AIShieldScreen,   icon: "sparkles-outline",      activeIcon: "sparkles"       },
];

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#a78bfa",
          tabBarInactiveTintColor: "#4b5563",
          tabBarStyle: {
            backgroundColor: "#0a0818",
            borderTopColor: "rgba(139, 92, 246, 0.2)",
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 10,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.3,
          },
          tabBarIcon: ({ focused, color, size }) => {
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
    </NavigationContainer>
  );
}
