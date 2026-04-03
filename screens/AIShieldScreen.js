// screens/AIShieldScreen.js — Premium Obsidian Redesign
import { useState, useRef, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, ActivityIndicator, FlatList, 
  KeyboardAvoidingView, Platform, Dimensions 
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { analyzeHarassment, safetyChat } from "../services/claude";

const { width } = Dimensions.get("window");

const BG      = "#0f0a1e";
const CARD    = "#1a1130";
const BORDER  = "rgba(139,92,246,0.18)";
const PRIMARY = "#8b5cf6";
const PINK    = "#ec4899";
const TEXT    = "#f1f0f5";
const SUBTEXT = "#9ca3af";
const GREEN   = "#34d399";
const AMBER   = "#fbbf24";
const RED     = "#ef4444";

const SEV_CONFIG = {
  none:     { bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.3)",  color: GREEN, icon: "checkmark-circle", label: "SAFE" },
  mild:     { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.3)",  color: AMBER, icon: "information-circle", label: "MILD RISK" },
  moderate: { bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.3)",  color: "#f97316", icon: "warning", label: "MODERATE" },
  severe:   { bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.4)",  color: RED, icon: "alert-circle", label: "SEVERE RISK" },
};

export default function AIShieldScreen() {
  const [text, setText]           = useState("");
  const [result, setResult]       = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [messages, setMessages]   = useState([
    { id: "0", role: "assistant", text: "Welcome Sarah. I'm your ShieldHer AI Safety Assistant. Ask me anything about women's safety, legal rights, or report suspicious text here." },
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
      setResult({ severity: "moderate", categories: ["Inappropriate Language"], summary: "AI flagged potential risks in the provided text.", action: "Exercise caution and document the communication.", reportTemplate: "Report for harassing content." });
    }
    setAnalyzing(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const reply = await safetyChat(messages, userMsg);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant", text: "I'm having trouble connecting to my database. Please try again later." }]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView style={a.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        
        {/* Header Ribbon */}
        <LinearGradient colors={["#12082a", BG]} style={a.headerRibbon}>
          <View style={a.headerContent}>
            <View>
              <Text style={a.badge}>ACTIVE ENCRYPTION</Text>
              <Text style={a.title}>AI Shield</Text>
            </View>
            <View style={a.aiPill}>
              <Ionicons name="sparkles" size={14} color={PRIMARY} />
              <Text style={a.aiPillText}>Gemini AI 2.0</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Detector Section */}
        <View style={a.card}>
          <View style={a.cardLabelRow}>
            <Ionicons name="scan" size={16} color={PRIMARY} />
            <Text style={a.cardLabel}>AI Harassment Detection</Text>
          </View>
          
          <TextInput
            style={a.textarea}
            placeholder="Paste suspicious messages, tweets, or chats here for screening…"
            placeholderTextColor="#4b5563"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity style={[a.analyzeBtn, (!text || analyzing) && { opacity: 0.6 }]} onPress={analyze} disabled={!text || analyzing}>
            {analyzing ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="white" />
                <Text style={a.analyzeBtnText}>Verify Safety Level</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Analysis Result */}
          {result && (
            <View style={[a.reportCard, { borderColor: (SEV_CONFIG[result.severity] || SEV_CONFIG.moderate).color + "40" }]}>
              <View style={a.reportTop}>
                <View style={[a.sevPill, { backgroundColor: (SEV_CONFIG[result.severity] || SEV_CONFIG.moderate).color + "20" }]}>
                  <Ionicons name={(SEV_CONFIG[result.severity] || SEV_CONFIG.moderate).icon} size={14} color={(SEV_CONFIG[result.severity] || SEV_CONFIG.moderate).color} />
                  <Text style={[a.sevText, { color: (SEV_CONFIG[result.severity] || SEV_CONFIG.moderate).color }]}>{(SEV_CONFIG[result.severity] || SEV_CONFIG.moderate).label}</Text>
                </View>
              </View>
              <Text style={a.summary}>{result.summary}</Text>
              <View style={a.actionBox}>
                <Text style={a.actionTitle}>RECOMMENDED ACTION</Text>
                <Text style={a.actionDesc}>{result.action}</Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Chat Section */}
        <View style={a.chatSection}>
          <Text style={a.sectionHeader}>ShieldHer Safety Assistant</Text>
          <View style={a.chatWindow}>
            <FlatList
              ref={flatRef}
              data={messages}
              scrollEnabled={false}
              keyExtractor={m => m.id}
              renderItem={({ item }) => (
                <View style={[a.bubbleFrame, item.role === "user" ? a.bubbleFrameUser : a.bubbleFrameBot]}>
                  {item.role === "assistant" && <View style={a.botAvatar}><Ionicons name="sparkles" size={14} color={PRIMARY} /></View>}
                  <View style={[a.bubble, item.role === "user" ? a.bubbleUser : a.bubbleBot]}>
                    <Text style={[a.bubbleText, item.role === "user" && { color: "white" }]}>{item.text}</Text>
                  </View>
                </View>
              )}
            />
            {chatLoading && (
              <View style={[a.bubbleFrame, a.bubbleFrameBot]}>
                <View style={a.botAvatar}><Ionicons name="sparkles" size={14} color={PRIMARY} /></View>
                <View style={a.bubbleBot}>
                  <Text style={a.typing}>Thinking…</Text>
                </View>
              </View>
            )}
          </View>

          {/* Chat Input */}
          <View style={a.inputRow}>
            <TextInput
              style={a.chatInput}
              placeholder="Ask anything about safety or laws…"
              placeholderTextColor="#4b5563"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendChat}
            />
            <TouchableOpacity style={[a.sendBtn, !chatInput.trim() && { opacity: 0.5 }]} onPress={sendChat}>
              <Ionicons name="send" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const a = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BG },
  headerRibbon:   { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerContent:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  badge:          { color: PRIMARY, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 2 },
  title:          { color: TEXT, fontSize: 26, fontWeight: "900" },
  aiPill:         { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(139,92,246,0.12)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: BORDER },
  aiPillText:     { color: TEXT, fontSize: 11, fontWeight: "700" },

  // Detector
  card:           { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: BORDER, marginTop: 10 },
  cardLabelRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardLabel:      { color: TEXT, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  textarea:       { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, color: TEXT, fontSize: 14, minHeight: 90, textAlignVertical: "top", marginBottom: 16 },
  analyzeBtn:     { backgroundColor: PINK, borderRadius: 16, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 4 },
  analyzeBtnText: { color: "white", fontWeight: "800", fontSize: 15 },

  // Report Card
  reportCard:     { marginTop: 16, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
  reportTop:      { flexDirection: "row" },
  sevPill:        { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sevText:        { fontSize: 11, fontWeight: "900" },
  summary:        { color: TEXT, fontSize: 14, lineHeight: 22, fontWeight: "500" },
  actionBox:      { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 12, gap: 4 },
  actionTitle:    { color: PRIMARY, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  actionDesc:     { color: SUBTEXT, fontSize: 12, fontWeight: "600" },

  // Chat Section
  chatSection:    { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader:  { color: TEXT, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginLeft: 6, marginBottom: 14 },
  chatWindow:     { gap: 12, marginBottom: 16 },
  bubbleFrame:    { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  bubbleFrameBot: { justifyContent: "flex-start" },
  bubbleFrameUser:{ justifyContent: "flex-end" },
  botAvatar:      { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 2, borderWidth: 1, borderColor: BORDER },
  bubble:         { maxWidth: "80%", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleBot:      { backgroundColor: CARD, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER },
  bubbleUser:     { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  bubbleText:     { color: SUBTEXT, fontSize: 14, lineHeight: 20 },
  typing:         { fontStyle: "italic", color: PRIMARY, fontSize: 12 },

  // Chat Input
  inputRow:       { flexDirection: "row", gap: 8, marginTop: 8 },
  chatInput:      { flex: 1, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 18, borderVertical: 12, color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER },
  sendBtn:        { width: 50, height: 50, borderRadius: 25, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", elevation: 2 },
});
