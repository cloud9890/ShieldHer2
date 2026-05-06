// src/navigation/RootNavigator.js
import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNavigationContainerRef } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator }    from "@react-navigation/native-stack";
import { Ionicons }                      from "@expo/vector-icons";
import { StatusBar }                     from "expo-status-bar";

import HomeScreen        from "../screens/main/HomeScreen";
import SafeRouteScreen   from "../screens/main/SafeRouteScreen";
import SafeCircleScreen  from "../screens/main/SafeCircleScreen";
import VaultScreen       from "../screens/main/VaultScreen";
import NearbyScreen      from "../screens/main/NearbyScreen";
import MoreScreen        from "../screens/main/MoreScreen";

import LoginScreen       from "../screens/auth/LoginScreen";

import AIShieldScreen    from "../screens/features/AIShieldScreen";
import SafetyLawsScreen  from "../screens/features/SafetyLawsScreen";
import SelfDefenseScreen from "../screens/features/SelfDefenseScreen";
import IncidentDetailScreen from "../screens/features/IncidentDetailScreen";

import ProfileScreen     from "../screens/settings/ProfileScreen";
import SupportScreen     from "../screens/settings/SupportScreen";
import PrivacyScreen     from "../screens/settings/PrivacyScreen";
import TermsScreen       from "../screens/settings/TermsScreen";

import OfflineBanner     from "../components/common/OfflineBanner";

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
  { name: "Home",   component: HomeScreen,       icon: "shield-outline",   activeIcon: "shield"    },
  { name: "Nearby", component: NearbyScreen,     icon: "location-outline", activeIcon: "location"  },
  { name: "Circle", component: SafeCircleScreen, icon: "people-outline",   activeIcon: "people"    },
  { name: "Vault",  component: VaultScreen,      icon: "folder-outline",   activeIcon: "folder"    },
  { name: "More",   component: MoreScreen,       icon: "grid-outline",     activeIcon: "grid"      },
];

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

const Tab = createMaterialTopTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      sceneContainerStyle={{ backgroundColor: DARK_BG }}
      // detachInactiveScreens defaults to true — inactive tabs are properly unmounted
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: CARD,
          borderTopColor:  BORDER,
          borderTopWidth:  1,
          height:          65,
          paddingBottom:   10,
          paddingTop:      6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
        tabBarIndicatorStyle: { height: 0 },
        tabBarIcon: ({ focused, color }) => {
          const tab = TABS.find(t => t.name === route.name);
          if (!tab) return <Ionicons name="help-circle-outline" size={22} color={color} />;
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

import { useAuth } from "@clerk/expo";
import { supabase, setSupabaseToken } from "../api/supabase";

const navigationRef = createNavigationContainerRef();

export default function RootNavigator() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    scheduleDailySafetyBriefing();
  }, []);

  // Navigate imperatively when auth state changes
  useEffect(() => {
    if (!isLoaded) return;
    if (!navigationRef.isReady()) return;
    if (isSignedIn) {
      navigationRef.navigate("MainTabs");
    } else {
      navigationRef.navigate("Auth");
    }
  }, [isLoaded, isSignedIn]);

  // Sync Clerk Session to Supabase Data Layer
  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken({ template: 'supabase' }).catch(() => getToken());
          setSupabaseToken(token);
          if (token) supabase.realtime.setAuth(token);
        } catch (e) {
          console.error("Clerk Token Sync Failed", e);
        }
      } else {
        setSupabaseToken(null);
        supabase.realtime.setAuth(null);
      }
    };
    syncToken();
  }, [isSignedIn, getToken]);

  // Still loading initial auth state from Clerk
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK_BG, justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={isSignedIn ? "MainTabs" : "Auth"}
        >
          {/* Auth screens — always registered so navigation state works */}
          <Stack.Screen name="Auth" component={AuthStack} />

          {/* App screens */}
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
        </Stack.Navigator>
        <OfflineBanner />
      </View>
    </NavigationContainer>
  );
}
