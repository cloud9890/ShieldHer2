// services/claude.js
// Migrated to Google Gemini API (Free Tier) to avoid Anthropic billing blocks.
// File name kept as claude.js to smoothly support existing frontend screen imports.

import { Platform } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";

export async function callClaude(system, messages, maxTokens = 800) {
  if (!API_KEY || API_KEY.includes("PLACE_YOUR_GEMINI_KEY_HERE")) {
    throw new Error("Missing or invalid Google Gemini API Key in .env file.");
  }

  const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  // Re-map Anthropic's message array format exactly into Google Gemini's distinct schema
  const geminiContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: geminiContents,
    generationConfig: { maxOutputTokens: maxTokens }
  };

  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || "Gemini AI generation failed.");
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("AI Fetch Error:", err);
    throw err;
  }
}

// ── Contextual AI Tools ──────────────────────────────────────────────────

export async function draftComplaint(incidentDetails) {
  const system = `You are an expert Indian pro-bono Lawyer specializing in Women's Rights (IPC & BNS). Draft a highly formal, strictly objective, and legally sound initial police complaint letter (FIR draft) based strictly on the provided details. Output ONLY the raw letter format starting with "To," and ending with the victim's placeholder signature block. Do not add conversational intro/outro text.`;
  const messages = [{ role: "user", content: `Incident Details: ${incidentDetails}` }];
  return await callClaude(system, messages, 600);
}

export async function analyzeRoute(start, end) {
  const system = `You are a real-time safety analyzer parsing route nodes. Compare the Start and End points against known global statistical safety metrics, time-of-day risk vectors, and general topography for women walking alone. Respond with a concise 3-sentence risk summary, highlighting key danger zones.`;
  const messages = [{ role: "user", content: `Route Coordinates or Names: Start [${start}] to End [${end}]. Analyze risk.` }];
  return await callClaude(system, messages, 300);
}