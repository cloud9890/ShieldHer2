// src/screens/SupportScreen.js
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BG_DEEP, CARD_DEEP, TEXT, SUBTEXT, PRIMARY, BORDER_VIOLET } from "../theme/colors";
import SectionLabel from "../components/common/SectionLabel";

export default function SupportScreen() {
  const handleEmail = () => {
    Linking.openURL("mailto:support@shieldher.app?subject=ShieldHer%20Support%20Request");
  };

  const handleFAQ = () => {
    Linking.openURL("https://shieldher.app/faq").catch(() =>
      Alert.alert("Unavailable", "Our FAQ page will be live soon. Contact support@shieldher.app for help.")
    );
  };

  const callHelpline = (number) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert("Error", "Unable to initiate call.")
    );
  };

  const handleBugReport = () => {
    Linking.openURL("mailto:bugs@shieldher.app?subject=Bug%20Report%20-%20Version%201.0&body=Please%20describe%20the%20bug%20you%20encountered:");
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <SectionLabel icon="help-buoy" title="Help & Support" color={PRIMARY} />

      <Text style={s.intro}>
        Need assistance or want to report an issue with the app? We're here to help you stay safe and secure.
      </Text>

      <TouchableOpacity style={s.card} onPress={handleFAQ} activeOpacity={0.7}>
        <View style={s.iconWrapper}>
          <Ionicons name="chatbubbles" size={24} color={PRIMARY} />
        </View>
        <View style={s.cardContent}>
          <Text style={s.cardTitle}>Frequently Asked Questions</Text>
          <Text style={s.cardDesc}>Read our guides on setting up your safety circle and using the SOS feature.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={SUBTEXT} />
      </TouchableOpacity>

      <TouchableOpacity style={s.card} onPress={handleEmail} activeOpacity={0.7}>
        <View style={s.iconWrapper}>
          <Ionicons name="mail" size={24} color={PRIMARY} />
        </View>
        <View style={s.cardContent}>
          <Text style={s.cardTitle}>Contact Support</Text>
          <Text style={s.cardDesc}>Email our dedicated safety support team directly at support@shieldher.app.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={SUBTEXT} />
      </TouchableOpacity>

      <TouchableOpacity style={s.card} onPress={handleBugReport} activeOpacity={0.7}>
        <View style={s.iconWrapper}>
          <Ionicons name="build" size={24} color={PRIMARY} />
        </View>
        <View style={s.cardContent}>
          <Text style={s.cardTitle}>Report a Bug</Text>
          <Text style={s.cardDesc}>Found a glitch? Let us know so we can fix it immediately.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={SUBTEXT} />
      </TouchableOpacity>

      {/* Emergency Helplines */}
      <Text style={s.sectionTitle}>Emergency Helplines (India)</Text>
      {[
        { name: "Women Helpline",    number: "181",  desc: "24×7 · Free · All states" },
        { name: "Police",            number: "100",  desc: "Control Room · Immediate" },
        { name: "National Emergency",number: "112",  desc: "All emergencies" },
        { name: "Domestic Violence", number: "7827170170", desc: "iCall · Counselling" },
      ].map(h => (
        <View key={h.number} style={[s.card, { justifyContent: "space-between" }]}>
          <View style={s.iconWrapper}>
            <Ionicons name="call" size={22} color="#22c55e" />
          </View>
          <View style={s.cardContent}>
            <Text style={s.cardTitle}>{h.name}</Text>
            <Text style={s.cardDesc}>{h.desc}</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" }}
            onPress={() => callHelpline(h.number)}
          >
            <Text style={{ color: "#22c55e", fontWeight: "800", fontSize: 14 }}>{h.number}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DEEP },
  content: { padding: 20 },
  intro: { color: SUBTEXT, fontSize: 15, lineHeight: 22, marginTop: 16, marginBottom: 24 },
  sectionTitle: { color: SUBTEXT, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 8, marginBottom: 10 },
  card: { backgroundColor: CARD_DEEP, borderWidth: 1, borderColor: BORDER_VIOLET, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(139,92,246,0.1)", justifyContent: "center", alignItems: "center", marginRight: 14 },
  cardContent: { flex: 1, marginRight: 10 },
  cardTitle: { color: TEXT, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardDesc: { color: SUBTEXT, fontSize: 13, lineHeight: 18 },
});

