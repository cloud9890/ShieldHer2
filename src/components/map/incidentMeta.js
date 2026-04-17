// src/components/map/incidentMeta.js
export const INCIDENT_TYPES = [
  { key: "suspicious", label: "Suspicious activity", color: "#ef4444", icon: "alert-circle",     bg: "rgba(239,68,68,0.12)"  },
  { key: "lighting",   label: "Poor lighting",        color: "#f59e0b", icon: "bulb-outline",     bg: "rgba(245,158,11,0.12)" },
  { key: "police",     label: "Police presence",      color: "#3b82f6", icon: "shield",           bg: "rgba(59,130,246,0.12)" },
  { key: "hospital",   label: "Hospital",             color: "#ec4899", icon: "medical",          bg: "rgba(236,72,153,0.12)" },
  { key: "safe",       label: "Safe zone",            color: "#22c55e", icon: "checkmark-circle", bg: "rgba(34,197,94,0.12)"  },
];

export function getTypeMeta(type) {
  return INCIDENT_TYPES.find(t => t.key === type) || INCIDENT_TYPES[0];
}

export const EMERGENCY_NUMBERS = [
  { label: "Police", number: "100", icon: "shield-checkmark", color: "#3b82f6" },
  { label: "Emergency", number: "112", icon: "warning", color: "#ef4444" },
  { label: "Ambulance", number: "108", icon: "medkit", color: "#ec4899" },
  { label: "Women", number: "181", icon: "woman", color: "#8b5cf6" },
];
