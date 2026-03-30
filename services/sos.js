// services/sos.js — with shake detection + all existing functionality
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import { Accelerometer } from "expo-sensors";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:4000";

// ── Shake Detection ────────────────────────────────────────────────────────
let _shakeSub   = null;
let _shakeCount = 0;
let _shakeTimer = null;

export function startShakeDetection(onTrigger) {
  if (_shakeSub) return;
  _shakeCount = 0;
  Accelerometer.setUpdateInterval(150);
  _shakeSub = Accelerometer.addListener(({ x, y, z }) => {
    const mag = Math.sqrt(x * x + y * y + z * z);
    if (mag > 2.8) {
      _shakeCount++;
      if (_shakeTimer) clearTimeout(_shakeTimer);
      _shakeTimer = setTimeout(() => { _shakeCount = 0; }, 3000);
      if (_shakeCount >= 5) {
        _shakeCount = 0;
        clearTimeout(_shakeTimer);
        _shakeTimer = null;
        onTrigger();
      }
    }
  });
}

export function stopShakeDetection() {
  _shakeSub?.remove();
  _shakeSub = null;
  if (_shakeTimer) clearTimeout(_shakeTimer);
  _shakeTimer = null;
  _shakeCount = 0;
}

// ── SOS Alert ─────────────────────────────────────────────────────────────
export async function sendSOSAlert(contacts, alertType = "sos") {
  try {
    const coords = await getCurrentLocation();
    const msg = buildMessage(alertType, coords);
    const results = await Promise.allSettled(contacts.map(c => sendSMS(c.phone, msg)));
    const sent = results.filter(r => r.status === "fulfilled").length;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alertType === "sos" ? "🚨 SOS Sent" : "✅ Safe Check-in Sent",
        body: `${sent} of ${contacts.length} contacts notified.`,
      },
      trigger: null,
    });
    return { success: true, sent, coords };
  } catch (err) {
    console.error("SOS error:", err);
    return { success: false, error: err.message };
  }
}

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission denied");
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return loc.coords;
}

function buildMessage(type, coords) {
  const link = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const templates = {
    sos:          `🚨 EMERGENCY ALERT from ShieldHer\n\nI need help! My live location:\n${link}\n\nTime: ${time}\n\nPlease call me immediately or contact emergency services.`,
    checkin:      `✅ Safe Check-in — ShieldHer\n\nI have arrived safely.\nLocation: ${link}\nTime: ${time}`,
    escort_start: `🛡️ ShieldHer Escort Started\n\nI'm sharing my live journey with you.\nStarting location: ${link}\nTime: ${time}`,
    escort_end:   `✅ Journey Complete — ShieldHer\n\nI've arrived safely!\nFinal location: ${link}\nTime: ${time}`,
  };
  return templates[type] || templates.sos;
}

async function sendSMS(phone, message) {
  const res = await fetch(`${BACKEND_URL}/api/sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: phone, message }),
  });
  if (!res.ok) throw new Error(`SMS failed for ${phone}`);
  return res.json();
}

// ── Recording ──────────────────────────────────────────────────────────────
let _recording = null;

export async function startEvidenceRecording() {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error("Audio permission denied");
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    _recording = recording;
    return true;
  } catch (err) {
    console.error("Recording error:", err);
    return false;
  }
}

export async function stopEvidenceRecording() {
  if (!_recording) return null;
  try {
    await _recording.stopAndUnloadAsync();
    const uri = _recording.getURI();
    _recording = null;
    return uri;
  } catch { return null; }
}

// ── Location Watch ─────────────────────────────────────────────────────────
let _locationSub = null;

export async function startLocationWatch(onUpdate) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return false;
  _locationSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
    loc => onUpdate(loc.coords)
  );
  return true;
}

export function stopLocationWatch() {
  _locationSub?.remove();
  _locationSub = null;
}

// ── Push Notifications ─────────────────────────────────────────────────────
export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch { return null; }
}