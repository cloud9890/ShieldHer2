// src/api/gemini.js
// Google Gemini AI integration for ShieldHer
// (Replaces the previous claude.js — file was renamed for clarity)

import { Platform } from "react-native";
import { callGeminiResilient } from "./geminiResilience";

// Backward-compat fallback if anyone calls this directly, though resilience layer handles it now.
export const callGemini = async (system, messages, maxTokens = 800) => {
  return callGeminiResilient(system, messages, "MEDIUM", maxTokens);
};

export const callClaude = callGemini;

// ── Contextual AI Tools ────────────────────────────────────────────────────

export async function draftComplaint(incidentDetails) {
  const system = `You are an expert Indian pro-bono Lawyer specializing in Women's Rights (IPC & BNS). Draft a highly formal, strictly objective, and legally sound initial police complaint letter (FIR draft) based strictly on the provided details. Output ONLY the raw letter format starting with "To," and ending with the victim's placeholder signature block. Do not add conversational intro/outro text.`;
  const details = typeof incidentDetails === "object"
    ? Object.entries(incidentDetails).map(([k, v]) => `${k}: ${v}`).join("\n")
    : incidentDetails;
  const messages = [{ role: "user", content: `Incident Details:\n${details}` }];
  return await callGeminiResilient(system, messages, "MEDIUM", 600);
}

export async function analyzeRoute(start, end, routeContext = "") {
  const system = `You are a real-time safety analyzer parsing route nodes for women's safety.
Evaluate the route and return ONLY a valid JSON object with the following exact schema (no markdown, no extra text):
{
  "highlights": [<3 concise bullet points identifying specific risks/benefits based on the provided data>],
  "tip": "<1 actionable safety tip for this specific route>"
}`;
  const messages = [{ role: "user", content: `Analyze this route:\nStart: ${start}\nEnd: ${end}\nContext: ${routeContext}` }];

  const text = await callGeminiResilient(system, messages, "MEDIUM", 400);
  if (!text) return null;
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
  return await callGeminiResilient(system, formattedHistory, "MEDIUM", 500);
}

export async function analyzeHarassment(text) {
  const system = `You are a digital harassment analyzer.
Evaluate the text strictly and return ONLY a valid JSON object matching this schema (no markdown, no extra text):
{
  "severity": "none" | "mild" | "moderate" | "severe",
  "categories": ["threatening", "harassment", "abusive", "sexual", "other"],
  "summary": "<1 sentence risk summary>",
  "action": "<1 actionable step>",
  "reportTemplate": "<Formal 1-sentence draft to report this to a platform>"
}`;
  const messages = [{ role: "user", content: "Analyze this message:\n" + JSON.stringify(text) }];
  const response = await callGeminiResilient(system, messages, "MEDIUM", 400);
  if (!response) throw new Error("AI analysis unavailable.");
  try {
    const cleanText = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (err) {
    console.error("Harassment parse err:", err);
    throw new Error("Invalid format");
  }
}

// ── Multi-modal Evidence Analysis ───────────────────────────────────────────
// This bypasses the resilient wrapper because it uses multimodal payload structure
// Will implement resilient multimodal wrapper if needed, but keeping simple for now
export async function analyzeEvidence(base64Data, mimeType = "image/jpeg") {
  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY_1;
  if (!API_KEY) throw new Error("Missing Google Gemini API Key.");

  const BASE = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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

// ── NEW AI Expansion Functions ─────────────────────────────────────────────

export async function getSituationBriefing(time, city, reports) {
  const system = `You are a concise safety advisor. Given the time of day, city, and recent incident reports, write a 2-line safety advisory.
Return ONLY a valid JSON object:
{
  "headline": "<1 short sentence>",
  "tip": "<1 actionable tip>",
  "riskLevel": "low" | "medium" | "high"
}`;
  const messages = [{ role: "user", content: `Context: Time: ${time}, City: ${city}, Reports: ${JSON.stringify(reports)}` }];
  const response = await callGeminiResilient(system, messages, "LOW", 200);
  if (!response) return null;
  try {
    const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export async function summariseReport(category, note, timeAgo) {
  const system = `Summarise this community safety report in 1 short sentence and assign a risk level and advice.
Return ONLY a valid JSON object:
{ "summary": "...", "risk": "low" | "medium" | "high", "advice": "..." }`;
  const messages = [{ role: "user", content: `Report: ${category}\nNotes: ${note}\nReported: ${timeAgo}` }];
  const response = await callGeminiResilient(system, messages, "LOW", 150);
  if (!response) return null;
  try {
    const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export async function getEscapeAdvice(nearbyPlaces, timeOfDay) {
  const system = `You are an emergency crisis advisor for women. A user feels unsafe. Based on nearby places and time of day, formulate 3 immediate numbered action steps to escape danger. No extra text, just JSON.
Return ONLY a valid JSON object:
{ "steps": ["step 1", "step 2", "step 3"] }`;
  const messages = [{ role: "user", content: `Time: ${timeOfDay}\nNearby Places: ${JSON.stringify(nearbyPlaces)}` }];
  const response = await callGeminiResilient(system, messages, "HIGH", 250);
  if (!response) return null;
  try {
    const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export async function detectIncidentPattern(incidents) {
  const system = `Analyze this user's history of safety incidents. Look for patterns in time, location, or type. Exclude any PII.
Return ONLY a valid JSON object:
{ "patternFound": boolean, "summary": "<1-2 sentences>", "recommendation": "<action step>", "urgency": "low" | "medium" | "high" }`;
  const messages = [{ role: "user", content: `Incidents: ${JSON.stringify(incidents)}` }];
  const response = await callGeminiResilient(system, messages, "LOW", 300);
  if (!response) return null;
  try {
    const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export async function recommendDefenseTechnique(scenario, techniques) {
  const system = `You are a women's self-defense expert. Map the user's dangerous scenario to the best defense techniques from the provided list.
Return ONLY a valid JSON object:
{ "recommendedTechniques": ["list", "of", "technique names"], "immediateSteps": ["step 1", "step 2"], "avoidActions": ["don't do this"] }`;
  const messages = [{ role: "user", content: `Scenario: ${scenario}\nAvailable Techniques: ${techniques.join(", ")}` }];
  const response = await callGeminiResilient(system, messages, "LOW", 300);
  if (!response) return null;
  try {
    const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch { return null; }
}

export async function legalChat(history, query) {
  const system = `You are a specialized Legal AI Assistant for Indian Women's Rights (IPC, BNS, POCSO, Vishakha guidelines, etc.). Provide concise, accurate legal advice and steps to take. Do not replace a real lawyer, but empower the user with knowledge.`;
  const formattedHistory = history.map(h => ({ role: h.role, content: h.text }));
  formattedHistory.push({ role: "user", content: query });
  return await callGeminiResilient(system, formattedHistory, "HIGH", 400);
}

export async function personaliseSOSMessage(template, context) {
  const system = `You are an SOS message personaliser. The user wants to add their own context to a standard emergency template. Output ONLY the final plain text message string. Keep it under 150 characters for SMS compliance. Retain the core emergency nature.`;
  const messages = [{ role: "user", content: `Template:\n${template}\n\nUser Context:\n${context}` }];
  const response = await callGeminiResilient(system, messages, "HIGH", 160);
  return response ? response.trim() : template;
}
