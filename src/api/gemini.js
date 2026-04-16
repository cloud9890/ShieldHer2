// src/api/gemini.js
// Google Gemini AI integration for ShieldHer
// (Replaces the previous claude.js — file was renamed for clarity)
// src/api/claude.js is kept as a backward-compat re-export shim.

import { Platform } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL   = "gemini-2.5-flash";

export async function callGemini(system, messages, maxTokens = 800) {
  if (!API_KEY) {
    throw new Error("Missing Google Gemini API Key. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.");
  }

  const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  // Map the Anthropic-style message schema to Gemini's distinct format
  const geminiContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    system_instruction: { parts: [{ text: system }] },
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
    console.error("Gemini Fetch Error:", err);
    throw err;
  }
}

// ── Contextual AI Tools ────────────────────────────────────────────────────

export async function draftComplaint(incidentDetails) {
  const system = `You are an expert Indian pro-bono Lawyer specializing in Women's Rights (IPC & BNS). Draft a highly formal, strictly objective, and legally sound initial police complaint letter (FIR draft) based strictly on the provided details. Output ONLY the raw letter format starting with "To," and ending with the victim's placeholder signature block. Do not add conversational intro/outro text.`;
  const details = typeof incidentDetails === "object"
    ? Object.entries(incidentDetails).map(([k, v]) => `${k}: ${v}`).join("\n")
    : incidentDetails;
  const messages = [{ role: "user", content: `Incident Details:\n${details}` }];
  return await callGemini(system, messages, 600);
}

export async function analyzeRoute(start, end, routeContext = "") {
  const system = `You are a real-time safety analyzer parsing route nodes for women's safety.
Evaluate the route and return ONLY a valid JSON object with the following exact schema (no markdown, no extra text):
{
  "safetyScore": <strict integer between 0 and 100 representing safety percentage>,
  "recommendation": <"safest" | "moderate" | "avoid">,
  "highlights": [<3 concise bullet points identifying specific risks/benefits>],
  "safeSpots": [{"name": "Police/Hospital name", "type": "police" | "hospital" | "store"}],
  "tip": "<1 actionable safety tip for this specific route>"
}`;
  const messages = [{ role: "user", content: `Analyze this route:\nStart: ${start}\nEnd: ${end}\nContext: ${routeContext}` }];

  const text = await callGemini(system, messages, 400);
  try {
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Failed to parse AI route JSON:", err);
    throw new Error("Invalid format");
  }
}

export async function safetyChat(history, query) {
  const system = `You are the ShieldHer AI Safety Assistant. Provide concise, legally accurate, and emotionally supportive answers related to women's safety, self-defense, rights, and using the ShieldHer app. Be brief but highly helpful.`;
  const formattedHistory = history.map(h => ({
    role: h.role,
    content: h.text
  }));
  formattedHistory.push({ role: "user", content: query });
  return await callGemini(system, formattedHistory, 500);
}

export async function analyzeHarassment(text) {
  const system = `You are a digital harassment analyzer.
Evaluate the text strictly and return ONLY a valid JSON object matching this schema (no markdown, no extra text):
{
  "severity": "none" | "mild" | "moderate" | "severe",
  "categories": ["threatening", "harassment", etc],
  "summary": "<1 sentence risk summary>",
  "action": "<1 actionable step>",
  "reportTemplate": "<Formal 1-sentence draft to report this to a platform>"
}`;
  const messages = [{ role: "user", content: "Analyze this message:\n" + JSON.stringify(text) }];
  const response = await callGemini(system, messages, 400);
  try {
    const cleanText = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Harassment parse err:", err);
    throw new Error("Invalid format");
  }
}

/**
 * ── Multi-modal Evidence Analysis ───────────────────────────────────────────
 * Uses Gemini 2.5 Flash to scan images, screenshots, or documents.
 */
export async function analyzeEvidence(base64Data, mimeType = "image/jpeg") {
  if (!API_KEY) {
    throw new Error("Missing Google Gemini API Key.");
  }

  const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: "You are an expert forensic evidence analyzer for the ShieldHer women's safety app. Your goal is to analyze the provided image (screenshot, photo, or document) and extract factual incident details. Return ONLY a valid JSON object." }]
    },
    contents: [{
      role: "user",
      parts: [
        { text: "Analyze this evidence. Extract: { 'incidentType', 'location', 'date', 'summary', 'extractedText' }. If any field is missing, use 'Unknown'. Be objective. The 'incidentType' must be one of: 'Verbal Harassment', 'Physical Harassment', 'Stalking', 'Online Harassment', 'Eve Teasing', 'Other'." },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]
    }]
  };

  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "AI analysis failed.");

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJSON = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJSON);
  } catch (err) {
    console.error("Evidence Analysis Error:", err);
    throw err;
  }
}

// ── Backward-compat alias for old callClaude import sites ──────────────────
export const callClaude = callGemini;
