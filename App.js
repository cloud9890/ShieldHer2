// App.js — ShieldHer Entry Point (Hackathon Clean Version)
import "react-native-gesture-handler"; 
import React from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import ErrorBoundary from "./src/components/common/ErrorBoundary";

import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  // Graceful fallback for development to avoid crash without key
  console.warn("Clerk publishable key missing.");
}

/**
 * ShieldHer: Modular Architecture Root
 * All navigation and logic are delegated to src/navigation/RootNavigator.js
 * for better maintainability and professional codebase presentation.
 */
export default function App() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey || "PLACEHOLDER"}>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </ClerkProvider>
  );
}
