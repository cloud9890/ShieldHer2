// src/api/claude.js
// ⚠️  DEPRECATED — This file is now a backward-compat shim.
// All logic has been moved to src/api/gemini.js.
// Please update your imports to use gemini.js directly.

export {
  callGemini,
  callGemini as callClaude,
  draftComplaint,
  analyzeRoute,
  safetyChat,
  analyzeHarassment,
  analyzeEvidence,
} from "./gemini";
