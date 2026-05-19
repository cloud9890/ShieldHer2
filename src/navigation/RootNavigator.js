// src/navigation/RootNavigator.js
import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNavigationContainerRef } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator }    from "@react-navigation/native-stack";
import { Shield, MapPin, Users, Folder, Grid, HelpCircle } from "lucide-react-native";
import { StatusBar }                     from "expo-status-bar";

import HomeScreen        from "../screens/main/HomeScreen";
import SafeRouteScreen   from "../screens/main/SafeRouteScreen";
import SafeCircleScreen  from "../screens/main/SafeCircleScreen";
import VaultScreen       from "../screens/main/VaultScreen";
import NearbyScreen      from "../screens/main/NearbyScreen";
import MoreScreen        from "../screens/main/MoreScreen";


import AIShieldScreen    from "../screens/features/AIShieldScreen";
import SafetyLawsScreen  from "../screens/features/SafetyLawsScreen";
import SelfDefenseScreen from "../screens/features/SelfDefenseScreen";
import IncidentDetailScreen from "../screens/features/IncidentDetailScreen";

import ProfileScreen     from "../screens/settings/ProfileScreen";
import SupportScreen     from "../screens/settings/SupportScreen";
import PrivacyScreen     from "../screens/settings/PrivacyScreen";
import TermsScreen       from "../screens/settings/TermsScreen";

import LoginScreen       from "../screens/auth/LoginScreen";
import SignUpScreen      from "../screens/auth/SignUpScreen";
import OnboardingScreen  from "../screens/auth/OnboardingScreen";

import OfflineBanner     from "../components/common/OfflineBanner";
import useAuthStore      from "../store/useAuthStore";

// API
import { scheduleDailySafetyBriefing } from "../api/sos";
import { BG, CARD, PRIMARY, BORDER, TEXT, MUTED } from "../theme/colors";

const DARK_BG = "#0d1117";

const Stack = createNativeStackNavigator();

const DARK_HEADER = (title) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: DARK_BG },
  headerTintColor: PRIMARY,
  headerTitleStyle: { color: TEXT, fontWeight: "700", fontSize: 17 },
  headerShadowVisible: false,
  headerBackTitle: "More",
});

const TABS = [
  { name: "Home",   component: HomeScreen,       icon: Shield  },
  { name: "Nearby", component: NearbyScreen,     icon: MapPin  },
  { name: "Circle", component: SafeCircleScreen, icon: Users   },
  { name: "Vault",  component: VaultScreen,      icon: Folder  },
  { name: "More",   component: MoreScreen,       icon: Grid    },
];

const Tab = createMaterialTopTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      sceneContainerStyle={{ backgroundColor: DARK_BG }}
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: CARD,
          borderRadius: 24,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 8,
          borderWidth: 1,
          borderColor: BORDER,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2, marginBottom: 8 },
        tabBarIndicatorStyle: { height: 0 },
        tabBarIcon: ({ focused, color }) => {
          const tab = TABS.find(t => t.name === route.name);
          const IconComponent = tab ? tab.icon : HelpCircle;
          return (
            <View style={{
              alignItems: "center", justifyContent: "center",
              ...(focused && {
                backgroundColor: "rgba(139,92,246,0.15)",
                borderRadius:    16,
                paddingHorizontal: 16,
                paddingVertical:   6,
              }),
            }}>
              <IconComponent size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          );
        },
        animationEnabled: true,
        lazy: true,
        swipeEnabled: true,
      })}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}

const AuthStack = createNativeStackNavigator();
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

const navigationRef = createNavigationContainerRef();

export default function RootNavigator() {
  const { user, loading } = useAuthStore();

  useEffect(() => {
    scheduleDailySafetyBriefing();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK_BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
        >
          {user ? (
            <Stack.Group>
              <Stack.Screen name="MainTabs"       component={TabNavigator} />
              <Stack.Screen name="Route"          component={SafeRouteScreen}     options={DARK_HEADER("Safe Route")}   />
              <Stack.Screen name="AI"             component={AIShieldScreen}      options={DARK_HEADER("AI Shield")}    />
              <Stack.Screen name="Laws"           component={SafetyLawsScreen}    options={DARK_HEADER("Safety Laws")}  />
              <Stack.Screen name="SelfDefense"    component={SelfDefenseScreen}   options={DARK_HEADER("Self Defense")} />
              <Stack.Screen name="Profile"        component={ProfileScreen}       options={DARK_HEADER("My Profile")}   />
              <Stack.Screen name="Support"        component={SupportScreen}       options={DARK_HEADER("Support")}      />
              <Stack.Screen name="Privacy"        component={PrivacyScreen}       options={DARK_HEADER("Privacy")}      />
              <Stack.Screen name="Terms"          component={TermsScreen}         options={DARK_HEADER("Terms")}        />
              <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} options={{ headerShown: false, presentation: "card" }} />
            </Stack.Group>
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
        <OfflineBanner />
      </View>
    </NavigationContainer>
  );
}
