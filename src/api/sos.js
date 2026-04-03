import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import * as TaskManager from "expo-task-manager";
import { supabase } from "./supabase";

const GUARDIAN_BG_TASK = "shieldher-guardian-bg";

TaskManager.defineTask(GUARDIAN_BG_TASK, ({ data, error }) => {
  if (error) return;
  // This headless task keeps the JS thread alive natively so _shakeSub continues to receive hardware accelerometer events!
});

// Lazy-load Accelerometer only on native (web doesn't support it)
const getAccelerometer = () => {
  if (Platform.OS === "web") return null;
  return require("expo-sensors").Accelerometer;
};

// ── Shake Detection ────────────────────────────────────────────────────────
let _shakeSub   = null;
let _shakeCount = 0;
let _shakeTimer = null;

export function startShakeDetection(onTrigger) {
  if (Platform.OS === "web") return; // not supported on web
  const Accelerometer = getAccelerometer();
  if (!Accelerometer || _shakeSub) return;
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


// ── Background Guardian ────────────────────────────────────────────────────
// Strategy: We use a foreground Service notification (via expo-notifications) 
// PLUS a location background task to keep the Android JS thread alive.
// This is the only way to guarantee the Accelerometer shake listener continues
// when the screen is locked, without writing native Java code.

const BG_CHANNEL_ID   = "shieldher-guardian";
let   _guardianNotifId = null;

// Re-exported so HomeScreen can always call this ref
let _shakeCallback = null;
export function setGlobalShakeCallback(cb) { _shakeCallback = cb; }

// The location task fires periodically while in background.
// We use this heartbeat to re-attach the shake listener if it was killed.
TaskManager.defineTask(GUARDIAN_BG_TASK, async ({ data, error }) => {
  if (error) return;
  // If JS thread is alive (it is, because this task ran), ensure shake is active
  if (_shakeCallback && !_shakeSub) {
    startShakeDetection(_shakeCallback);
  }
});

export async function startBackgroundGuardian(onShake) {
  if (Platform.OS === "web") return false;

  // Store the callback so the task can reattach it
  if (onShake) _shakeCallback = onShake;

  // ── Step 1: Setup notification channel (Android Foreground Service) ──────
  await Notifications.setNotificationChannelAsync(BG_CHANNEL_ID, {
    name:       "Guardian Mode",
    importance: Notifications.AndroidImportance.LOW,
    sound:      null,
    vibrationPattern: [0],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  if (!_guardianNotifId) {
    const notif = await Notifications.scheduleNotificationAsync({
      content: {
        title: "ShieldHer Guardian Active",
        body:  "Shake detection is running. Shake vigorously 5× to trigger SOS.",
        data:  { type: "guardian" },
        sticky: true,
        autoDismiss: false,
        android: {
          channelId: BG_CHANNEL_ID,
          ongoing:   true,
          priority:  "low",
          smallIcon:  "notification_icon",
          color:      "#8b5cf6",
        },
      },
      trigger: null,
    });
    _guardianNotifId = notif;
  }

  // ── Step 2: Start location background task (keeps JS thread alive) ────────
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();

    if (fg === "granted" && bg === "granted") {
      const isReg = await TaskManager.isTaskRegisteredAsync(GUARDIAN_BG_TASK);
      if (!isReg) {
        await Location.startLocationUpdatesAsync(GUARDIAN_BG_TASK, {
          accuracy:   Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 0,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "ShieldHer Guardian Active",
            notificationBody:  "Shake detection is running in background.",
            notificationColor: "#8b5cf6",
          },
        });
      }
    }
  } catch (e) {
    console.warn("Background location task failed (permissions?):", e.message);
    // Even without location permission, the notification keeps the thread alive
  }

  return true;
}

export async function stopBackgroundGuardian() {
  if (Platform.OS === "web") return;

  // Remove persistent notification
  if (_guardianNotifId) {
    await Notifications.dismissNotificationAsync(_guardianNotifId).catch(() => {});
    _guardianNotifId = null;
  }
  await Notifications.dismissAllNotificationsAsync().catch(() => {});

  // Stop location task
  try {
    const isReg = await TaskManager.isTaskRegisteredAsync(GUARDIAN_BG_TASK);
    if (isReg) await Location.stopLocationUpdatesAsync(GUARDIAN_BG_TASK);
  } catch (e) { /* already stopped */ }
}


// ── SOS Alert ─────────────────────────────────────────────────────────────
export async function sendSOSAlert(contacts, alertType = "sos", preFetchedCoords = null) {
  try {
    const coords = preFetchedCoords || await getCurrentLocation();
    const msg = buildMessage(alertType, coords);
    const results = await Promise.allSettled(contacts.map(c => sendSMS(c.phone, msg)));
    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      failed.forEach(f => console.error("SMS rejection:", f.reason));
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alertType === "sos" ? "SOS Sent" : "Safe Check-in Sent",
          body: `${sent} of ${contacts.length} contacts notified.`,
        },
        trigger: null,
      });
    } catch (notifErr) {
      console.warn("Notification skipped:", notifErr.message);
    }
    return { success: true, sent, failed: failed.length, coords };
  } catch (err) {
    console.error("SOS error:", err);
    return { success: false, error: err.message };
  }
}

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission denied");
  // Use Balanced (not High) — High fails silently on web
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://fklkcolgqaglrzukoslz.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbGtjb2xncWFnbHJ6dWtvc2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjE2MjIsImV4cCI6MjA5MDMzNzYyMn0.tqDS0SXcxNFaCN3jyV--tNlL9ptuiCLvk6ZiYJQuIg4";

async function sendSMS(phone, message) {
  // Direct fetch instead of supabase.functions.invoke — avoids silent auth failures on web
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ to: phone, message }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(`SMS failed for ${phone}: ${result.error || res.status}`);
  console.log(`SMS sent to ${phone}:`, result.sid);
  return result;
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
