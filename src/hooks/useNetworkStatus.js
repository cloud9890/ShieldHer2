// src/hooks/useNetworkStatus.js
// Lightweight online/offline detection using expo-network (no extra deps needed)
import { useState, useEffect } from "react";
import * as Network from "expo-network";
import { AppState } from "react-native";

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  const check = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
    } catch (_) {
      setIsOnline(true); // assume online if check fails
    }
    setIsChecking(false);
  };

  useEffect(() => {
    check();

    // Re-check when app becomes active (user returns from settings etc.)
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    // Poll every 15s as a fallback (expo-network has no subscription API)
    const interval = setInterval(check, 15000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isChecking };
}
