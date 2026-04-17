# 💜 ShieldHer

**ShieldHer** is a comprehensive, production-ready mobile safety application designed to empower individuals with intelligent, real-time protection tools. Built with React Native, Supabase, and Google Gemini AI, ShieldHer goes beyond a basic panic button to offer proactive safety measures, encrypted evidence vaults, and community-driven hazard mapping.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React Native Expo](https://img.shields.io/badge/React_Native-Expo-blueviolet)

---

## 🔥 Key Features

### 1. Guardian Mode & Smart SOS
- **Device-Agnostic SOS Activation:** Shake the device or press the on-screen SOS button to instantly transition into emergency mode.
- **Background Push Dispatch:** SMS distress signals containing your real-time latitude/longitude are autonomously dispatched to your local `SafeCircle` via Twilio integration.
- **Auto-Recording Pipeline:** Evidence recording of background audio is automatically triggered when an emergency is declared and automatically vaulted.

### 2. Live Tracking & AI Commute Escort
- **Real-Time GPS Synchronization:** Start a Live tracking session that continuously streams device telemetry to an encrypted Supabase `live_sessions` cache.
- **Panic-Proof Backgrounding:** Essential location updates persist even when the app is placed in a background device state.

### 3. Community Heatmaps & Hazard Navigation
- **Google Maps Integration:** Explore local hazard heatmaps overlaying user-submitted incident zones.
- **Predictive Safe Routing:** Calculates walking or transit routes that actively reroute to avoid community-reported dangerous hotspots.

### 4. Forensic Evidence Vault
- **Encrypted Media Storage:** Snap images or upload contextual audio of harassment natively, which is securely transmitted to a private Supabase bucket.
- **Gemini NLP FIR Summaries:** The integrated Google Gemini vision-language model analyzes the vault payload and generates formally drafted legal complaints/FIR reports ready to be submitted to law enforcement.

### 5. Safety AI & Education Hub
- **Safety Assistant:** An integrated chatbot trained to navigate legal rights, local authorities, and crisis de-escalation tips.
- **Harassment Detection ML:** Copy/paste suspicious texts or DMs, and let ShieldHer measure the severity and draft blocking templates or authoritative responses. 
- **Laws & Curated Video Integrations:** Immediate access to native laws involving domestic violence, workplace boundaries, cyber harassment, and fundamental self-defense video libraries.

---

## 🛠 Tech Stack

**Frontend Architecture:**
* React Native (Expo) SDK
* React Navigation (Stack + Bottom Tabs)
* Expo Sensors (Gyroscope, Push Notifications, Audio AV, MapView)

**Backend Architecture (BaaS):**
* Supabase Auth & JWT Management
* PostgreSQL (with recursive Row Level Security policies)
* Real-time Database Subscriptions & Cloud Storage Buckets

**External Integrations:**
* Twilio Communications API
* Google Maps Platform
* Google Gemini Core AI

---

## 🚀 Getting Started

**Prerequisites:**
You will need Node.js installed, as well as an Expo developer account.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cloud9890/ShieldHer2.git
   cd ShieldHer2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root folder exposing the required keys (DO NOT commit these to Git):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_google_ai_studio_key
   EXPO_PUBLIC_TWILIO_VERIFIED_NUMBER=your_twilio_number
   ```

4. **Initialize the Supabase Schema:**
   Run the SQL statements found in `supabase/schema.sql` within your Supabase project's SQL editor to map the underlying tables and storage buckets.

5. **Start the development server:**
   ```bash
   npx expo start
   ```
   *Scan the generated QR Code using the Expo Go app on iOS/Android.*

---

## 🛡 Security & Hardening Features
- **Idempotent Declarative Schema Constraints:** Guards have been written explicitly to prevent data leakage and sandbox bucket access exclusively to authenticated UIDs.
- **Strict Stale-State Enclosures:** Safe functional callbacks are utilized heavily to avoid memory mapping errors during concurrent React hook evaluations.
- **Instructional Prompt Injection Barriers:** AI integration queries are highly sanitized using `JSON.stringify()` serialization buffers prior to dispatch.
- **Accessible Voice Navigation:** Fully classified standard OS Screenreader (ADA) interfaces utilizing `accessibilityRole` declarations.

---

*Stay safe, stay empowered.*
