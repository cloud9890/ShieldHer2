// src/api/sos.js
// ShieldHer — Unified SOS, Guardian, Live Location, Auto-Danger Detection
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import * as TaskManager from "expo-task-manager";
import { supabase } from "./supabase";

const GUARDIAN_BG_TASK = "shieldher-guardian-bg";
const BG_CHANNEL_ID    = "shieldher-guardian";
const SOS_CATEGORY_ID  = "sos_guardian";
// Read credentials from env only — never hard-code secrets
const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ── Accelerometer lazy-loader ──────────────────────────────────────────────
const getAccelerometer = () => {
  if (Platform.OS === "web") return null;
  return require("expo-sensors").Accelerometer;
};

// ── Shake Detection ────────────────────────────────────────────────────────
let _shakeSub   = null;
let _shakeCount = 0;
let _shakeTimer = null;

export function startShakeDetection(onTrigger) {
  if (Platform.OS === "web") return;
  const Acc = getAccelerometer();
  if (!Acc || _shakeSub) return;
  _shakeCount = 0;
  Acc.setUpdateInterval(150);
  _shakeSub = Acc.addListener(({ x, y, z }) => {
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

// ── Auto Danger Detection ──────────────────────────────────────────────────
// Analyses accelerometer + GPS to automatically detect danger situations
let _dangerSub        = null;
let _dangerCallback   = null;
let _impactBuffer     = [];
let _panicStartTime   = null;
let _autoSOSTimer     = null;
const IMPACT_THRESHOLD = 4.2;     // G-force for fall/push/collision
const PANIC_THRESHOLD  = 2.2;     // G-force for sustained panic running
const PANIC_DURATION   = 8000;    // 8 seconds of sustained panic = alert
const AUTO_SOS_DELAY   = 10000;   // 10 second cancel window before auto-SOS fires

let _locationWatchForDanger = null;

export function startAutoDangerDetection(onDangerDetected) {
  if (Platform.OS === "web") return;
  const Acc = getAccelerometer();
  if (!Acc || _dangerSub) return;
  _dangerCallback = onDangerDetected;
  Acc.setUpdateInterval(200);

  _dangerSub = Acc.addListener(({ x, y, z }) => {
    const mag = Math.sqrt(x * x + y * y + z * z);

    // 1. IMPACT: sudden spike (fall / push / collision)
    if (mag > IMPACT_THRESHOLD) {
      triggerAutoSOS("impact");
      return;
    }

    // 2. PANIC RUNNING: sustained high motion
    if (mag > PANIC_THRESHOLD) {
      if (!_panicStartTime) _panicStartTime = Date.now();
      if (Date.now() - _panicStartTime > PANIC_DURATION) {
        triggerAutoSOS("panic_run");
        _panicStartTime = null;
      }
    } else {
      _panicStartTime = null;
    }
  });

  // 3. FORCED VEHICLE: GPS speed check at night
  _startNightSpeedWatch(onDangerDetected);
}

// 3. FORCED VEHICLE: GPS speed + night + sustained duration + acceleration anomaly
// Anti-false-positive measures:
//   • Must see high speed for FORCED_VEHICLE_CONSECUTIVE_READINGS consecutive updates (~3 min at 10s interval)
//   • Must also detect an acceleration spike, ruling out smooth legitimate travel
//   • Minimum 2-minute cooldown between triggers so alerts don’t cascade
const FORCED_VEHICLE_COOLDOWN_MS = 2 * 60 * 1000;  // 2 minutes
const FORCED_VEHICLE_CONSECUTIVE = 3;               // readings at high speed needed
const FORCED_VEHICLE_ACCEL_SPIKE = 1.5;             // m/s² speed-change between GPS fixes
let _forcedVehicleCount     = 0;
let _forcedVehicleLastSpeed = 0;
let _forcedVehicleLastAlert = 0;

async function _startNightSpeedWatch(onDangerDetected) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    _locationWatchForDanger = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 50 },
      (loc) => {
        const speed = loc.coords.speed || 0; // m/s
        const kmh   = speed * 3.6;
        const hour  = new Date().getHours();
        const now   = Date.now();

        // Gate 1: Night hours only (23:00 – 03:59)
        const isNight = hour >= 23 || hour < 4;
        if (!isNight) { _forcedVehicleCount = 0; return; }

        // Gate 2: Speed threshold
        if (kmh < 80) { _forcedVehicleCount = 0; _forcedVehicleLastSpeed = speed; return; }

        // Gate 3: Acceleration anomaly — sudden jerky speed change rules out smooth Uber travel
        const accelDelta = Math.abs(speed - _forcedVehicleLastSpeed); // m/s change since last fix
        _forcedVehicleLastSpeed = speed;
        if (accelDelta < FORCED_VEHICLE_ACCEL_SPIKE) return; // smooth travel — ignore

        // Gate 4: Must sustain for multiple consecutive readings
        _forcedVehicleCount++;
        if (_forcedVehicleCount < FORCED_VEHICLE_CONSECUTIVE) return;

        // Gate 5: Cooldown between alerts (prevent cascading triggers)
        if (now - _forcedVehicleLastAlert < FORCED_VEHICLE_COOLDOWN_MS) return;

        _forcedVehicleCount     = 0;
        _forcedVehicleLastAlert = now;
        triggerAutoSOS("forced_vehicle");
      }
    );
  } catch (_) {}
}

function triggerAutoSOS(reason) {
  if (_autoSOSTimer) return; // already pending
  if (_dangerCallback) _dangerCallback(reason, cancelAutoSOS);
  _autoSOSTimer = setTimeout(() => {
    _autoSOSTimer = null;
    // Auto-fire SOS — caller (HomeScreen) should handle this via callback
    if (_dangerCallback) _dangerCallback(reason + "_confirmed", null);
  }, AUTO_SOS_DELAY);
}

export function cancelAutoSOS() {
  if (_autoSOSTimer) {
    clearTimeout(_autoSOSTimer);
    _autoSOSTimer = null;
  }
}

export function stopAutoDangerDetection() {
  _dangerSub?.remove();
  _dangerSub = null;
  _locationWatchForDanger?.remove();
  _locationWatchForDanger = null;
  cancelAutoSOS();
  _panicStartTime          = null;
  _dangerCallback          = null;
  // Reset forced-vehicle counters so a fresh start is clean
  _forcedVehicleCount      = 0;
  _forcedVehicleLastSpeed  = 0;
  _forcedVehicleLastAlert  = 0;
}

// ── Background Guardian ────────────────────────────────────────────────────
let _guardianNotifId = null;
let _shakeCallback   = null;
export function setGlobalShakeCallback(cb) { _shakeCallback = cb; }

// Background location task — also re-attaches shake listener as heartbeat
TaskManager.defineTask(GUARDIAN_BG_TASK, async ({ data, error }) => {
  if (error) return;
  if (_shakeCallback && !_shakeSub) startShakeDetection(_shakeCallback);
});

export async function startBackgroundGuardian(onShake) {
  if (Platform.OS === "web") return false;
  if (onShake) _shakeCallback = onShake;

  // Register notification action category (SOS button on lock screen)
  try {
    await Notifications.setNotificationCategoryAsync(SOS_CATEGORY_ID, [
      {
        identifier: "TRIGGER_SOS",
        buttonTitle: "🚨 TRIGGER SOS",
        options: { isDestructive: true, opensAppToForeground: true },
      },
    ]);
  } catch (_) {}

  // Set up notification channel
  await Notifications.setNotificationChannelAsync(BG_CHANNEL_ID, {
    name: "Guardian Mode",
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: [0],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  if (!_guardianNotifId) {
    const notif = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🛡️ ShieldHer Guardian Active",
        body: "Shake × 5 to trigger SOS. Tap TRIGGER SOS below for immediate help.",
        data: { type: "guardian" },
        sticky: true,
        autoDismiss: false,
        categoryIdentifier: SOS_CATEGORY_ID,
        android: {
          channelId: BG_CHANNEL_ID,
          ongoing: true,
          priority: "low",
          color: "#8b5cf6",
        },
      },
      trigger: null,
    });
    _guardianNotifId = notif;
  }

  // Start background location task (5s heartbeat keeps JS thread alive)
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (fg === "granted" && bg === "granted") {
      const isReg = await TaskManager.isTaskRegisteredAsync(GUARDIAN_BG_TASK);
      if (!isReg) {
        await Location.startLocationUpdatesAsync(GUARDIAN_BG_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,       // 5s heartbeat (was 15s)
          distanceInterval: 0,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "ShieldHer Guardian Active",
            notificationBody: "Monitoring for danger. Shake × 5 for SOS.",
            notificationColor: "#8b5cf6",
          },
        });
      }
    }
  } catch (e) {
    console.warn("Background location:", e.message);
  }
  return true;
}

export async function stopBackgroundGuardian() {
  if (Platform.OS === "web") return;
  if (_guardianNotifId) {
    await Notifications.dismissNotificationAsync(_guardianNotifId).catch(() => {});
    _guardianNotifId = null;
  }
  try {
    const isReg = await TaskManager.isTaskRegisteredAsync(GUARDIAN_BG_TASK);
    if (isReg) await Location.stopLocationUpdatesAsync(GUARDIAN_BG_TASK);
  } catch (_) {}
}

// ── Live Session (Escort Real-time Location) ───────────────────────────────
let _liveSessionId  = null;
let _locationSub    = null;

export async function createLiveSession() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("live_sessions")
      .insert({
        user_id:    user.id,
        lat:        0,
        lng:        0,
        is_active:  true,
        started_at: new Date().toISOString(),   // ← was missing; track page crashed
      })
      .select("id")
      .single();
    if (error) throw error;
    _liveSessionId = data.id;
    return data.id;
  } catch (e) {
    console.error("createLiveSession:", e.message);
    return null;
  }
}

export async function endLiveSession() {
  if (!_liveSessionId) return;
  try {
    await supabase.from("live_sessions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", _liveSessionId);
  } catch (_) {}
  _liveSessionId = null;
}

// ── Location Watch (escort + live location sharing) ────────────────────────
// Returns a Promise that resolves with the first coords once GPS lock is obtained.
export function startLocationWatch(onUpdate) {
  return new Promise(async (resolve) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { resolve(null); return; }

      let firstResolved = false;

      _locationSub = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.BestForNavigation,
          timeInterval:     2000,   // every 2 seconds
          distanceInterval: 1,      // or every 1 metre
        },
        async (loc) => {
          const coords = loc.coords;
          // Notify the UI immediately on every update
          onUpdate(coords);
          // Write to Supabase live_session for real-time tracking
          if (_liveSessionId) {
            supabase.from("live_sessions").update({
              lat:        coords.latitude,
              lng:        coords.longitude,
              updated_at: new Date().toISOString(),
            }).eq("id", _liveSessionId).then(({ error }) => {
              if (error) console.warn("live session update:", error.message);
            });
          }
          // Resolve the promise on the FIRST real fix so the caller can use accurate coords
          if (!firstResolved) {
            firstResolved = true;
            resolve(coords);
          }
        }
      );

      // Fallback: if GPS hasn't fired within 5s, resolve with last known position
      setTimeout(async () => {
        if (!firstResolved) {
          firstResolved = true;
          try {
            const last = await Location.getLastKnownPositionAsync({ maxAge: 30000 });
            resolve(last?.coords ?? null);
          } catch { resolve(null); }
        }
      }, 5000);

    } catch (e) {
      console.error("startLocationWatch:", e.message);
      resolve(null);
    }
  });
}

export function stopLocationWatch() {
  _locationSub?.remove();
  _locationSub = null;
}

// ── SOS Alert ─────────────────────────────────────────────────────────────
export async function sendSOSAlert(contacts, alertType = "sos", preFetchedCoords = null, customMsg = null) {
  try {
    const coords = preFetchedCoords || await getCurrentLocation();
    const msg    = customMsg || buildMessage(alertType, coords);
    const results = await Promise.allSettled(contacts.map(c => sendSMS(c.phone, msg)));
    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) failed.forEach(f => console.error("SMS:", f.reason));
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alertType === "sos" ? "🚨 SOS Sent" : "✅ Safe Check-in Sent",
          body: `${sent} of ${contacts.length} contacts notified.`,
        },
        trigger: null,
      });
    } catch (_) {}
    return { success: true, sent, failed: failed.length, coords };
  } catch (err) {
    console.error("SOS error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendEscortSOS(contacts, sessionId, preFetchedCoords = null, customMsg = null) {
  try {
    const coords = preFetchedCoords || await getCurrentLocation();
    const trackUrl = getLiveTrackingUrl(sessionId);
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const fallbackMsg = `🛡️ ShieldHer — Live Escort Started\n\nTrack my live location in real-time:\n${trackUrl}\n\n• Map updates every 2 seconds\n• Link expires when I arrive safely\n\nTime: ${time}`;
    const msg = customMsg ? `${customMsg}\n\nLive tracking: ${trackUrl}` : fallbackMsg;
    const results = await Promise.allSettled(contacts.map(c => sendSMS(c.phone, msg)));
    const sent = results.filter(r => r.status === "fulfilled").length;
    return { success: true, sent, trackUrl };
  } catch (err) {
    console.error("Escort SOS error:", err);
    return { success: false, error: err.message };
  }
}

export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Permission denied");
    
    let loc = await Location.getLastKnownPositionAsync({ maxAge: 15000 });
    if (!loc) {
      loc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced, 
        timeout: 4000 
      });
    }
    return loc.coords;
  } catch (e) {
    console.warn("GPS lock failed, sending SOS without exact location.", e.message);
    return { latitude: 0, longitude: 0 }; // Fallback so SMS still sends!
  }
}

function buildMessage(type, coords) {
  const link = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const templates = {
    sos:          `🚨 EMERGENCY ALERT — ShieldHer\n\nI need immediate help!\nMy location: ${link}\nTime: ${time}\n\nPlease call me or contact emergency services (112).`,
    checkin:      `✅ Safe Check-in — ShieldHer\n\nI have arrived safely.\nLocation: ${link}\nTime: ${time}`,
    escort_start: `🛡️ ShieldHer Escort Started\n\nStarting location: ${link}\nTime: ${time}`,
    escort_end:   `✅ Journey Complete — ShieldHer\n\nI've arrived safely!\nFinal location: ${link}\nTime: ${time}`,
    auto_sos:     `🆘 AUTO-DANGER ALERT — ShieldHer\n\nThe app detected a possible danger situation!\nLast known location: ${link}\nTime: ${time}\n\nPlease check on me immediately.`,
  };
  return templates[type] || templates.sos;
}

async function sendSMS(phone, message) {
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

// ── Push Notifications ─────────────────────────────────────────────────────
export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch { return null; }
}

export async function scheduleDailySafetyBriefing() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🛡️ Morning Safety Briefing",
        body: "Tap to review community alerts and AI safety insights for your commute.",
        data: { route: "Home" }
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      },
    });
  } catch(e) {
    console.warn("Failed to schedule daily briefing:", e);
  }
}
