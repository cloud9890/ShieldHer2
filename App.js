// App.js — ShieldHer Entry Point (Hackathon Clean Version)
import "react-native-gesture-handler"; 
import React, { useEffect } from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import ErrorBoundary from "./src/components/common/ErrorBoundary";
import useAuthStore from "./src/store/useAuthStore";

export default function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <RootNavigator />
    </ErrorBoundary>
  );
}
