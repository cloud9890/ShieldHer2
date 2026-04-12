// src/screens/TermsScreen.js
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { BG_DEEP, TEXT, SUBTEXT } from "../theme/colors";
import SectionLabel from "../components/common/SectionLabel";

export default function TermsScreen() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <SectionLabel icon="document-text" title="Terms of Service" color="#cbd5e1" />
      
      <Text style={s.h1}>1. Acceptance & Modification of Terms</Text>
      <Text style={s.p}>
        By accessing or using the ShieldHer application, you agree to be bound by these Terms of Service. We reserve the right to modify these terms at any time. Significant material changes will be communicated via the app or via the email address associated with your account. Your continued use of the Application signifies your acceptance of any updated terms.
      </Text>

      <Text style={s.h1}>2. Eligibility & Account Security</Text>
      <Text style={s.p}>
        You must be at least 13 years of age to utilize ShieldHer. You are responsible for safeguarding your account credentials, maintaining the confidentiality of your Vault biometrics, and ensuring that your nominated emergency contacts (Guardians) are accurate and have consented to being contacted in an emergency.
      </Text>

      <Text style={s.h1}>3. Nature of the Service & Limitations</Text>
      <Text style={s.p}>
        ShieldHer is designed to be a supplementary personal safety tool. It relies entirely on your device's active cellular, internet, and GPS connections.{"\n\n"}
        CRITICAL WARNING: ShieldHer is NOT a replacement for municipal emergency services (such as 911 or 112). We do not guarantee continuous, uninterrupted access to the platform due to factors beyond our control (e.g., carrier outages, API downtime). You must always exercise personal vigilance.
      </Text>

      <Text style={s.h1}>4. Acceptable Use & Conduct</Text>
      <Text style={s.p}>
        When utilizing the "Community Reports" map feature, you agree to report accurately and responsibly. Users caught submitting false reports, spamming safety alerts, or attempting to reverse-engineer the API will be permanently banned from the platform. You may not use this application to harass, stalk, or intimidate any individual.
      </Text>

      <Text style={s.h1}>5. Limitation of Liability & Indemnification</Text>
      <Text style={s.p}>
        To the maximum extent permitted by applicable law, ShieldHer, its developers, and its affiliates shall not be liable for any direct, indirect, incidental, or consequential damages, personal injury, or distress resulting from your reliance on the app. You agree to indemnify and hold harmless ShieldHer from any claims arising from your use or misuse of the services.
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
