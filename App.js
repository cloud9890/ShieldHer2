// App.js — ShieldHer Entry Point (Hackathon Clean Version)
import "react-native-gesture-handler"; 
import React from "react";
import RootNavigator from "./src/navigation/RootNavigator";

/**
 * ShieldHer: Modular Architecture Root
 * All navigation and logic are delegated to src/navigation/RootNavigator.js
 * for better maintainability and professional codebase presentation.
 */
export default function App() {
  return <RootNavigator />;
}
