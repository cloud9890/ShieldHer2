// services/claude.js
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const MODEL   = "claude-3-5-sonnet-20241022";
const BASE    = "https://api.anthropic.com/v1/messages";

async function callClaude(system, messages, maxTokens = 1000) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map(b => b.text || "").join("") || "";
}

export async function analyzeRoute(from, to, timeOfDay) {
  const text = await callClaude(
    "You are ShieldHer's SafeRoute AI. Respond ONLY in valid JSON, no markdown.",
    [{ role: "user", content: `Analyze safety of route from "${from}" to "${to}" at ${timeOfDay}. Return: { "safetyScore": 0-100, "recommendation": "safest|moderate|avoid", "highlights": ["3 notes"], "safeSpots": [{"name":"...","type":"police|hospital|store"}], "tip": "one tip" }` }]
  );
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function draftComplaint(incident) {
  return callClaude(
    "You are a legal assistant helping women document harassment. Write formal, professional complaint letters.",
    [{ role: "user", content: `Draft a formal police complaint letter for:\nType: ${incident.type}\nLocation: ${incident.location}\nDate: ${incident.date}\nDescription: ${incident.description}\nInclude: To (SHO), Subject, body with facts, and signature block for "Complainant".` }],
    1500
  );
}

export async function analyzeHarassment(text) {
  const resp = await callClaude(
    "You are a harassment detection AI. Respond ONLY in valid JSON, no markdown.",
    [{ role: "user", content: `Analyze for harassment/threats: "${text}"\nReturn: { "severity": "none|mild|moderate|severe", "categories": [], "summary": "...", "action": "...", "reportTemplate": "..." }` }]
  );
  return JSON.parse(resp.replace(/```json|```/g, "").trim());
}

export async function safetyChat(history, newMsg) {
  const messages = [
    ...history.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: newMsg },
  ];
  return callClaude(
    "You are ShieldHer's safety AI. Help women with safety advice, legal rights, and emotional support. Be concise, warm, and empowering. Max 3 sentences.",
    messages
  );
}