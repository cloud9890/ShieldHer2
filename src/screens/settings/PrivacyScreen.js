// src/screens/PrivacyScreen.js
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { BG_DEEP, TEXT, SUBTEXT } from "../../theme/colors";
import SectionLabel from "../../components/common/SectionLabel";

export default function PrivacyScreen() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <SectionLabel icon="shield-checkmark" title="Privacy Policy" color="#6ee7b7" />
      
      <Text style={s.h1}>1. Information We Collect</Text>
      <Text style={s.p}>
        ShieldHer collects information to provide and improve our safety services. This includes:{"\n"}
        • Account Information: Name, email address, phone number, and biometric data (which remains encrypted locally on your device).{"\n"}
        • Emergency Contacts: Names and phone numbers of individuals you designate as Guardians. You confirm you have their consent to provide this data.{"\n"}
        • Location Data: Precise GPS location data is collected ONLY when features like "Safe Route", "Guardian Mode", or "SOS" are active. Background location may be utilized to track your safety status dynamically.{"\n"}
        • Audio & Media: In the event of an SOS activation, ShieldHer may auto-record audio and capture media. This data is securely stored in your Evidence Vault.
      </Text>

      <Text style={s.h1}>2. How We Use Your Data</Text>
      <Text style={s.p}>
        Your data is strictly used to maximize your personal safety. We use your location to broadcast emergency signals to your Safe Circle and to render live community alerts. Your data is NEVER sold to third-party advertisers or data brokers.
      </Text>

      <Text style={s.h1}>3. Evidence Vault & Security</Text>
      <Text style={s.p}>
        ShieldHer employs cutting-edge encryption mechanisms. Any media (audio or photos) captured during an SOS event is encrypted and stored in your secure Evidence Vault via Supabase secure storage. Accessing this vault requires biometric authentication (FaceID/TouchID) bound specifically to your device. We cannot access your unencrypted media.
      </Text>

      <Text style={s.h1}>4. Community Reports</Text>
      <Text style={s.p}>
        When creating a community report (e.g., Suspicious Person, Unlit Area), your generalized location and report details become visible to the public feed to help others. Your identity, however, remains strictly anonymous to the broader community.
      </Text>

      <Text style={s.h1}>5. Third-Party Integrations</Text>
      <Text style={s.p}>
        We partner with selected third parties strictly for critical functionality:{"\n"}
        • Supabase: For secure cloud database storage and instantaneous authentication.{"\n"}
        • Google Cloud / Gemini AI: For providing safe routing logic and advanced analytical threat mapping. Sensitive or personally identifiable information shared in AI chats is not utilized to train global AI models.
      </Text>

      <Text style={s.h1}>6. Data Deletion & Rights</Text>
      <Text style={s.p}>
        You maintain full ownership of your data. You may delete your account and all associated emergency contacts, vault evidence, and historical data at any time via the Profile Settings.
      </Text>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DEEP },
  content: { padding: 20 },
  h1: { color: TEXT, fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 8, letterSpacing: 0.5 },
  p: { color: SUBTEXT, fontSize: 14, lineHeight: 22 },
});
