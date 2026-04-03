// screens/AIShieldScreen.js
import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { analyzeHarassment, safetyChat } from "../services/claude";

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";

const SEV_CONFIG = {
  none:     { bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)",  color: "#34d399", icon: "checkmark-circle", label: "NONE"     },
  mild:     { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)",  color: "#fbbf24", icon: "information-circle", label: "MILD"    },
  moderate: { bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)",  color: "#f97316", icon: "warning",           label: "MODERATE" },
  severe:   { bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.3)",  color: "#f87171", icon: "alert-circle",      label: "SEVERE"   },
};

export default function AIShieldScreen() {
  const [text, setText]           = useState("");
  const [result, setResult]       = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [messages, setMessages]   = useState([
    { id: "0", role: "assistant", text: "Hi! I'm your ShieldHer AI 💜 Ask me anything about safety, legal rights, or how to use the app." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const flatRef = useRef(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    try {
      const data = await analyzeHarassment(text);
      setResult(data);
    } catch {
      setResult({ severity: "moderate", categories: ["threatening language"], summary: "Contains potentially threatening content.", action: "Document and report to platform immediately.", reportTemplate: "Reporting this message for threatening and harassing content." });
    }
    setAnalyzing(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMsg = { id: Date.now().toString(), role: "user", text: userMsg };
    setMessages(m => [...m, newMsg]);
    setChatLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const reply = await safetyChat(history, userMsg);
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: "assistant", text: reply }]);
    } catch {
      setMessages(m => [...m, { id: (Date.now() + 1).toString(), role: "assistant", text: "Sorry, I couldn't respond right now. Please try again." }]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sev = result ? (SEV_CONFIG[result.severity] || SEV_CONFIG.moderate) : null;

  return (
    <KeyboardAvoidingView style={a.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={a.header}>
          <Text style={a.title}>AI Shield</Text>
          <Text style={a.subtitle}>Powered by Google Gemini AI</Text>
        </View>

        {/* Harassment Analyzer */}
        <View style={a.card}>
          <View style={a.cardHeader}>
            <View style={a.cardIconBg}>
              <Ionicons name="scan" size={16} color={PINK} />
            </View>
            <View>
              <Text style={a.cardTitle}>Harassment Detector</Text>
              <Text style={a.cardSub}>Analyze any message for threats or abuse</Text>
            </View>
          </View>

          <TextInput
            style={a.textarea}
            placeholder="Paste suspicious message here…"
            placeholderTextColor="#374151"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity style={[a.analyzeBtn, (!text || analyzing) && { opacity: 0.5 }]} onPress={analyze} disabled={!text || analyzing}>
            {analyzing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="search" size={16} color="white" />
                <Text style={a.analyzeBtnText}>Analyze Message</Text>
              </>
            )}
          </TouchableOpacity>

          {result && sev && (
            <View style={[a.resultBox, { backgroundColor: sev.bg, borderColor: sev.border }]}>
              <View style={a.resultTopRow}>
                <View style={[a.sevBadge, { backgroundColor: sev.color + "20", borderColor: sev.color + "40" }]}>
                  <Ionicons name={sev.icon} size={14} color={sev.color} />
                  <Text style={[a.sevLabel, { color: sev.color }]}>{sev.label} SEVERITY</Text>
                </View>
              </View>
              <Text style={[a.resultSummary, { color: sev.color }]}>{result.summary}</Text>
              <View style={a.actionRow}>
                <Ionicons name="arrow-forward-circle" size={14} color={sev.color} />
                <Text style={[a.actionText, { color: sev.color }]}>{result.action}</Text>
              </View>
              {result.reportTemplate && (
                <View style={a.templateBox}>
                  <Text style={a.templateLabel}>Report template:</Text>
                  <Text style={a.templateText}>"{result.reportTemplate}"</Text>
                </View>
              )}
              {result.categories?.length > 0 && (
                <View style={a.catRow}>
                  {result.categories.map((c, i) => (
                    <View key={i} style={[a.catChip, { borderColor: sev.color + "40" }]}>
                      <Text style={[a.catText, { color: sev.color }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Chat */}
        <View style={a.chatCard}>
          <View style={a.cardHeader}>
            <View style={[a.cardIconBg, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
              <Ionicons name="chatbubbles" size={16} color={PRIMARY} />
            </View>
            <View>
              <Text style={a.cardTitle}>Safety Assistant</Text>
              <Text style={a.cardSub}>Ask about safety, rights, and more</Text>
            </View>
          </View>

          <View style={a.chatWindow}>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={m => m.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={[a.bubble, item.role === "user" ? a.bubbleUser : a.bubbleBot]}>
                  {item.role === "assistant" && (
                    <View style={a.botAvatar}>
                      <Ionicons name="sparkles" size={14} color={PRIMARY} />
                    </View>
                  )}
                  <View style={[a.bubbleBg, item.role === "user" ? a.bubbleBgUser : a.bubbleBgBot]}>
                    <Text style={[a.bubbleText, item.role === "user" && { color: "white" }]}>{item.text}</Text>
                  </View>
                </View>
              )}
            />
            {chatLoading && (
              <View style={[a.bubble, a.bubbleBot]}>
                <View style={a.botAvatar}>
                  <Ionicons name="sparkles" size={14} color={PRIMARY} />
                </View>
                <View style={a.bubbleBgBot}>
                  <View style={a.typingDots}>
                    <View style={a.dot} />
                    <View style={[a.dot, { opacity: 0.6 }]} />
                    <View style={[a.dot, { opacity: 0.3 }]} />
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={a.chatInputRow}>
            <TextInput
              style={a.chatInput}
              placeholder="Ask anything…"
              placeholderTextColor="#374151"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendChat}
              returnKeyType="send"
            />
            <TouchableOpacity style={[a.sendBtn, (!chatInput || chatLoading) && { opacity: 0.4 }]} onPress={sendChat} disabled={!chatInput || chatLoading}>
              <Ionicons name="send" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const a = StyleSheet.create({
  container:     { flex: 1, backgroundColor: BG },
  header:        { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  title:         { fontSize: 24, fontWeight: "800", color: TEXT },
  subtitle:      { fontSize: 12, color: PRIMARY, marginTop: 4, fontWeight: "600" },
  card:          { backgroundColor: CARD, borderRadius: 20, padding: 18, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  cardHeader:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  cardIconBg:    { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(236,72,153,0.12)", alignItems: "center", justifyContent: "center" },
  cardTitle:     { fontSize: 15, fontWeight: "700", color: TEXT },
  cardSub:       { fontSize: 11, color: SUBTEXT, marginTop: 1 },
  textarea:      { borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, fontSize: 13, color: TEXT, height: 88, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.03)" },
  analyzeBtn:    { backgroundColor: PINK, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  analyzeBtnText:{ color: "white", fontWeight: "700", fontSize: 14 },
  // Result
  resultBox:     { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 14, gap: 8 },
  resultTopRow:  { flexDirection: "row" },
  sevBadge:      { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sevLabel:      { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  resultSummary: { fontSize: 13, lineHeight: 19 },
  actionRow:     { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  actionText:    { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  templateBox:   { backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 10, padding: 10, gap: 3 },
  templateLabel: { fontSize: 10, color: SUBTEXT, fontWeight: "600", textTransform: "uppercase" },
  templateText:  { fontSize: 12, fontStyle: "italic", color: SUBTEXT },
  catRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catChip:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  catText:       { fontSize: 11, fontWeight: "500" },
  // Chat
  chatCard:      { backgroundColor: CARD, borderRadius: 20, marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  chatWindow:    { padding: 14, minHeight: 160, maxHeight: 270 },
  bubble:        { marginBottom: 8 },
  bubbleBot:     { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bubbleUser:    { flexDirection: "row-reverse" },
  botAvatar:     { width: 24, height: 24, borderRadius: 8, backgroundColor: "rgba(139,92,246,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubbleBg:      { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleBgBot:   { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  bubbleBgUser:  { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  bubbleText:    { fontSize: 13, color: SUBTEXT, lineHeight: 18 },
  typingDots:    { flexDirection: "row", gap: 4, paddingVertical: 4, paddingHorizontal: 2 },
  dot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: SUBTEXT },
  chatInputRow:  { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: BORDER },
  chatInput:     { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: TEXT, backgroundColor: "rgba(255,255,255,0.03)" },
  sendBtn:       { backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 16, justifyContent: "center" },
});
