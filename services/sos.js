// services/sos.js
// Handles all SOS logic: SMS via Twilio, live location, recording

import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:4000";

// ── Types ──────────────────────────────────────────────────────────────────
// alertType: "sos" | "checkin" | "escort_start" | "escort_end"

// ── Main SOS trigger ───────────────────────────────────────────────────────
export async function sendSOSAlert(contacts, alertType = "sos") {
  try {
    // 1. Get current GPS
    const coords = await getCurrentLocation();

    // 2. Build message based on alert type
    const msg = buildMessage(alertType, coords);

    // 3. Send to backend → Twilio SMS for each contact
    const results = await Promise.allSettled(
      contacts.map(c => sendSMS(c.phone, msg))
    );

    // 4. Log how many succeeded
    const sent = results.filter(r => r.status === "fulfilled").length;
    console.log(`SOS sent to ${sent}/${contacts.length} contacts`);

    // 5. Push local notification to confirm
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

// ── Get GPS coords ─────────────────────────────────────────────────────────
export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission denied");
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return loc.coords;
}

// ── Build SMS message ──────────────────────────────────────────────────────
function buildMessage(type, coords) {
  const mapsLink = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const templates = {
    sos: `🚨 EMERGENCY ALERT from ShieldHer\n\nI need help! My live location:\n${mapsLink}\n\nTime: ${time}\n\nPlease call me immediately or contact emergency services.`,
    checkin: `✅ Safe Check-in — ShieldHer\n\nI have arrived safely.\nLocation: ${mapsLink}\nTime: ${time}`,
    escort_start: `🛡️ ShieldHer Escort Started\n\nI'm sharing my live journey with you.\nStarting location: ${mapsLink}\nTime: ${time}\n\nYou'll receive a safe check-in when I arrive.`,
    escort_end: `✅ Journey Complete — ShieldHer\n\nI've arrived safely!\nFinal location: ${mapsLink}\nTime: ${time}`,
  };

  return templates[type] || templates.sos;
}

// ── Send SMS via backend (Twilio) ──────────────────────────────────────────
async function sendSMS(phone, message) {
  const res = await fetch(`${BACKEND_URL}/api/sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: phone, message }),
  });
  if (!res.ok) throw new Error(`SMS failed for ${phone}`);
  return res.json();
}

// ── Start audio recording (evidence) ──────────────────────────────────────
let _recording = null;

export async function startEvidenceRecording() {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error("Audio permission denied");

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    _recording = recording;
    console.log("🎙️ Evidence recording started");
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
    console.log("🎙️ Recording saved:", uri);
    return uri; // local file URI — upload to S3 in production
  } catch (err) {
    console.error("Stop recording error:", err);
    return null;
  }
}

// ── Watch location continuously (for escort mode) ─────────────────────────
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

// ── Register for push notifications ───────────────────────────────────────
export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}