// src/api/geminiResilience.js
// Resilience Layer for Gemini API calls: Rate limit rotation, Model cascade, Token budgeting, Caching

import { Platform } from "react-native";

// ── Key Pool ────────────────────────────────────────────────────────────────
// The system will try these keys in order. If Key 1 hits a 429, it tries Key 2.
const KEY_POOL = [
  process.env.EXPO_PUBLIC_GEMINI_API_KEY,      // Legacy / Primary key
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,    // Primary Key (Explicit)
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,    // Secondary Key
  process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,    // Tertiary Key
].filter(Boolean); // Remove empty/undefined values

// Ensure unique keys
const UNIQUE_KEYS = [...new Set(KEY_POOL)];

// ── Model Cascade ─────────────────────────────────────────────────────────
// HIGH: Complex analysis, required features (SOS, Legal)
// MEDIUM: Route analysis, chats
// LOW: Background summaries, low-context tasks
const MODEL_CASCADE = {
  HIGH:   ["gemini-2.5-flash", "gemini-1.5-flash"],
  MEDIUM: ["gemini-1.5-flash", "gemini-1.5-flash-8b"],
  LOW:    ["gemini-1.5-flash-8b", "gemini-1.5-flash"],
};

// ── Response Cache ──────────────────────────────────────────────────────────
// In-memory cache. Keys are hashes of the prompt.
// Values: { response: string, expiresAt: number }
const responseCache = new Map();

// Generate a simple hash from the system prompt and user messages
function hashPrompt(system, messages) {
  let str = system;
  for (const m of messages) str += m.role + m.content;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Core Gemini fetch call (single attempt)
async function attemptGemini(key, model, system, messages, maxTokens) {
  if (!key) throw new Error("Missing Google Gemini API Key.");

  const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const geminiContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: geminiContents,
    generationConfig: { maxOutputTokens: maxTokens }
  };

  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || "Gemini AI generation failed.");
    err.status = res.status;
    throw err;
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Resilient Gemini caller
 * @param {string} system System instruction prompt
 * @param {Array} messages Array of { role: "user"|"assistant", content: string }
 * @param {string} priority "HIGH" | "MEDIUM" | "LOW"
 * @param {number} maxTokens Max output tokens
 * @returns {Promise<string|null>} The AI response or null if everything failed
 */
export async function callGeminiResilient(system, messages, priority = "MEDIUM", maxTokens = 400) {
  if (UNIQUE_KEYS.length === 0) {
    console.error("Gemini Error: No API keys configured in environment.");
    return null;
  }

  const cacheKey = hashPrompt(system, messages);
  const ttlSeconds = { HIGH: 0, MEDIUM: 300, LOW: 3600 }[priority] || 0; // 0=No cache, 300=5min, 3600=1hr

  // 1. Cache Check
  if (ttlSeconds > 0) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.response;
    }
  }

  // 2. Cascade through Models -> Keys -> Retries
  const models = MODEL_CASCADE[priority] || MODEL_CASCADE.MEDIUM;

  for (const model of models) {
    for (const key of UNIQUE_KEYS) {
      // 3 attempts per key/model for 5xx errors
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await attemptGemini(key, model, system, messages, maxTokens);
          
          // Store successful response in cache
          if (ttlSeconds > 0) {
            responseCache.set(cacheKey, {
              response,
              expiresAt: Date.now() + (ttlSeconds * 1000)
            });
          }
          
          return response;
        } catch (err) {
          // 429 Too Many Requests -> Immediately break to next key
          if (err.status === 429) {
            console.warn(`[Gemini 429] Rate limit hit on key ending in ...${key.slice(-4)}. Trying next key.`);
            break; 
          }
          
          // 5xx Server Error -> Exponential Backoff
          if (err.status >= 500) {
            console.warn(`[Gemini 5xx] Server error on attempt ${attempt+1}. Retrying...`);
            await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
            continue;
          }
          
          // 400/401/403/Other -> Fail fast (bad input, invalid key, etc)
          console.error(`[Gemini Error] Unrecoverable error: ${err.message}`);
          throw err;
        }
      }
    }
  }

  console.error("[Gemini Resilience] All models and keys exhausted.");
  // Graceful degradation: Return null instead of throwing, allowing UI to fallback
  return null; 
}
