// services/claude.js — Gemini AI (text + vision)
import { Platform } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "AIzaSyB4bXWRRikdACdl3end7Ow4VY8iAw23DKE";
const MODEL   = "gemini-2.5-flash";
const BASE    = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// ── Core Gemini call (text only) ─────────────────────────────────────────────
export async function callClaude(system, messages, maxTokens = 800) {
  if (!API_KEY) throw new Error("Missing Gemini API Key.");

  const geminiContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: geminiContents,
    generationConfig: { maxOutputTokens: maxTokens },
  };

  const res  = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini AI generation failed.");
  return data.candidates[0].content.parts[0].text;
}

// ── Vision call (image + text) ───────────────────────────────────────────────
export async function callGeminiVision(prompt, base64Data, mimeType = "image/jpeg") {
  if (!API_KEY) throw new Error("Missing Gemini API Key.");

  const payload = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } },
      ],
    }],
    generationConfig: { maxOutputTokens: 1000 },
  };

  const res  = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini Vision failed.");
  return data.candidates[0].content.parts[0].text;
}

// ── Evidence Image Analysis ───────────────────────────────────────────────────
export async function analyzeEvidenceImage(base64Data, mimeType = "image/jpeg") {
  const prompt = `You are a women's safety AI and legal expert. Carefully examine this image as evidence of a harassment or safety incident.

Extract and return ONLY a valid JSON object with this exact schema (no markdown, no extra text):
{
  "incidentType": "<one of: Verbal Harassment | Physical Harassment | Stalking | Online Harassment | Eve Teasing | Other>",
  "summary": "<2-3 sentence objective description of what the image shows as evidence>",
  "location": "<any location info visible in the image, or 'Not visible'>",
  "date": "<any date/time info visible, or 'Not visible'>",
  "severity": "<Low | Medium | High | Critical>",
  "legalNote": "<1 sentence about which law/section this could fall under in India>",
  "draftComplaint": "<A formal 3-4 sentence complaint paragraph ready to attach to an FIR, written in third person>"
}`;

  const text = await callGeminiVision(prompt, base64Data, mimeType);
  try {
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    // If JSON fails, return a best-effort structure
    return {
      incidentType: "Other",
      summary: text.slice(0, 300),
      location: "Not visible",
      date: "Not visible",
      severity: "Medium",
      legalNote: "Consult a legal expert for applicable sections.",
      draftComplaint: text.slice(0, 500),
    };
  }
}

// ── Text complaint draft ──────────────────────────────────────────────────────
export async function draftComplaint(incidentDetails) {
  const system = `You are an expert Indian pro-bono Lawyer specializing in Women's Rights (IPC & BNS). Draft a highly formal, strictly objective, and legally sound initial police complaint letter (FIR draft) based strictly on the provided details. Output ONLY the raw letter format starting with "To," and ending with the victim's placeholder signature block. Do not add conversational intro/outro text.`;
  const messages = [{ role: "user", content: `Incident Details: ${JSON.stringify(incidentDetails)}` }];
  return await callClaude(system, messages, 700);
}

// ── Route analysis ────────────────────────────────────────────────────────────
export async function analyzeRoute(start, end, routeContext = "") {
  const system = `You are a real-time safety analyzer. Return ONLY valid JSON with this exact schema (no markdown):
{"safetyScore":<0-100>,"recommendation":"safest"|"moderate"|"avoid","highlights":[<3 bullets>],"safeSpots":[{"name":"","type":"police"|"hospital"|"store"}],"tip":"<1 tip>"}`;
  const messages = [{ role: "user", content: `Analyze route:\nStart: ${start}\nEnd: ${end}\nContext: ${routeContext}` }];
  const text = await callClaude(system, messages, 400);
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch { throw new Error("Invalid format"); }
}

// ── Safety chat ───────────────────────────────────────────────────────────────
export async function safetyChat(history, query) {
  const system = `You are the ShieldHer AI Safety Assistant. Provide concise, legally accurate, and emotionally supportive answers related to women's safety, self-defense, rights, and using the ShieldHer app. Be brief but highly helpful.`;
  const formatted = history.map(h => ({ role: h.role, content: h.text }));
  formatted.push({ role: "user", content: query });
  return await callClaude(system, formatted, 500);
}

// ── Harassment analysis ───────────────────────────────────────────────────────
export async function analyzeHarassment(text) {
  const system = `You are a digital harassment analyzer. Return ONLY valid JSON (no markdown):
{"severity":"none"|"mild"|"moderate"|"severe","categories":[],"summary":"<1 sentence>","action":"<1 step>","reportTemplate":"<formal 1-sentence report>"}`;
  const messages = [{ role: "user", content: `Analyze: "${text}"` }];
  const response = await callClaude(system, messages, 400);
  try {
    return JSON.parse(response.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch { throw new Error("Invalid format"); }
}