// src/hooks/useBiometric.js
// Custom hook for biometric authentication (fingerprint / face)
import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";

let LocalAuthentication = null;
if (Platform.OS !== "web") {
  try { LocalAuthentication = require("expo-local-authentication"); } catch (_) {}
}

export default function useBiometric() {
  const [supported, setSupported] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!LocalAuthentication) { setChecking(false); return; }
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setSupported(compatible && enrolled);
      } catch (_) {}
      setChecking(false);
    })();
  }, []);

  const authenticate = useCallback(async (promptMessage = "Authenticate to access Evidence Vault") => {
    if (!LocalAuthentication || !supported) {
      setAuthenticated(true);
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      setAuthenticated(result.success);
      return result.success;
    } catch (_) {
      setAuthenticated(false);
      return false;
    }
  }, [supported]);

  return { supported, authenticated, checking, authenticate, setAuthenticated };
}
