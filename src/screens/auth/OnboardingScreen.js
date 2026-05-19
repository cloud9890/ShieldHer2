// src/screens/auth/OnboardingScreen.js
import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Hoverable from "../../components/common/Hoverable";
import { ShieldAlert, Map, LockKeyhole } from "lucide-react-native";
import {
  BG_DEEP,
  CARD_DEEP,
  PRIMARY,
  TEXT,
  SUBTEXT,
  PINK,
  SUCCESS,
} from "../../theme/colors";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Shake to SOS",
    description:
      "Instantly alert your trusted circle and emergency services by simply shaking your device in times of danger.",
    icon: ShieldAlert,
    color: PINK,
  },
  {
    id: "2",
    title: "Guardian Mode",
    description:
      "Advanced background detection for sudden impacts, panic running, and unsafe late-night routes.",
    icon: Map,
    color: PRIMARY,
  },
  {
    id: "3",
    title: "Evidence Vault",
    description:
      "Automatically record and securely store encrypted audio and video evidence during emergency situations.",
    icon: LockKeyhole,
    color: SUCCESS,
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#1e1b4b', '#000000']} style={StyleSheet.absoluteFillObject} />
      
      {/* Abstract Glow Orbs */}
      <View style={s.orb1} />
      <View style={s.orb2} />

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon;
          return (
            <View key={slide.id} style={s.slide}>
              <View style={s.glassCard}>
                <View
                  style={[
                    s.iconBox,
                    {
                      backgroundColor: slide.color + "1A",
                      borderColor: slide.color + "40",
                    },
                  ]}
                >
                  <Icon size={72} color={slide.color} />
                </View>
                <Text style={s.title}>{slide.title}</Text>
                <Text style={s.description}>{slide.description}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <View style={s.pagination}>
          {SLIDES.map((_, i) => {
            const opacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            const scale = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.8, 1.2, 0.8],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { opacity, transform: [{ scale }] }]}
              />
            );
          })}
        </View>

        <Hoverable style={s.btn} onPress={() => navigation.navigate("Login")}>
          <LinearGradient
            colors={['#8b5cf6', '#6d28d9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.btnGradient}
          >
            <Text style={s.btnText}>Get Started</Text>
          </LinearGradient>
        </Hoverable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  orb1: {
    position: 'absolute',
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#8b5cf6',
    opacity: 0.15,
  },
  orb2: {
    position: 'absolute',
    bottom: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#ec4899',
    opacity: 0.1,
  },
  slide: { width, alignItems: "center", justifyContent: "center", padding: 24 },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 26,
  },
  footer: { padding: 40, paddingBottom: 60 },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c084fc' },
  btn: {
    height: 60,
    borderRadius: 16,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
});
