import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, useWindowDimensions, ScrollView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Shield, Smartphone, ArrowRight } from "lucide-react-native";
import Hoverable from "../../components/common/Hoverable";

export default function HeroLandingScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const isDesktop = width > 768;

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#1e1b4b', '#000000']} style={StyleSheet.absoluteFillObject} />
      <View style={s.orb1} />
      <View style={s.orb2} />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[s.contentWrapper, isDesktop ? s.rowContent : s.colContent]}>
          
          {/* Left: Text Content */}
          <View style={[s.textContent, isDesktop ? { flex: 1, paddingRight: 40 } : { width: '100%', alignItems: 'center' }]}>
            <View style={s.badge}>
              <Shield size={14} color="#8b5cf6" />
              <Text style={s.badgeText}>ShieldHer2 Web Edition</Text>
            </View>
            <Text style={[s.headline, !isDesktop && { textAlign: 'center', fontSize: 40 }]}>
              Personal Safety,{"\n"}Powered by <Text style={{ color: '#8b5cf6' }}>AI</Text>.
            </Text>
            <Text style={[s.subhead, !isDesktop && { textAlign: 'center' }]}>
              ShieldHer2 uses AI, real-time community alerts, and background guardian technology to keep you safe on the go.
            </Text>
            <View style={[s.btnRow, !isDesktop && { justifyContent: 'center' }]}>
              <Hoverable style={s.primaryBtn} onPress={() => navigation.navigate("Onboarding")}>
                <Text style={s.primaryBtnText}>Get Started</Text>
                <ArrowRight size={16} color="white" />
              </Hoverable>
              <Hoverable style={s.secondaryBtn} onPress={() => {}}>
                <Smartphone size={16} color="#e2e8f0" />
                <Text style={s.secondaryBtnText}>Download App</Text>
              </Hoverable>
            </View>
          </View>

          {/* Right: Mockup */}
          <View style={[s.mockupContainer, isDesktop ? { flex: 1 } : { width: '100%', marginTop: 60 }]}>
            <Animated.View style={[s.mockupDevice, { transform: [{ translateY: floatAnim }] }]}>
              {/* Fake App UI */}
              <View style={s.fakeHeader} />
              <View style={s.fakeCard} />
              <View style={s.fakeCardSmall} />
              <View style={s.fakeSosBtn}>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 20 }}>SOS</Text>
              </View>
            </Animated.View>
            
            {/* Glowing reflection underneath */}
            <View style={s.mockupShadow} />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, minHeight: '100%' },
  contentWrapper: { maxWidth: 1200, width: '100%', alignSelf: 'center', alignItems: 'center' },
  rowContent: { flexDirection: 'row', justifyContent: 'space-between' },
  colContent: { flexDirection: 'column', paddingTop: 60, paddingBottom: 60 },
  
  orb1: { position: 'absolute', top: -100, left: -50, width: 400, height: 400, borderRadius: 200, backgroundColor: '#8b5cf6', opacity: 0.15 },
  orb2: { position: 'absolute', bottom: -50, right: -100, width: 500, height: 500, borderRadius: 250, backgroundColor: '#ec4899', opacity: 0.1 },
  
  textContent: { justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  badgeText: { color: '#c4b5fd', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  headline: { color: '#f8fafc', fontSize: 56, fontWeight: '900', lineHeight: 64, marginBottom: 20 },
  subhead: { color: '#94a3b8', fontSize: 18, lineHeight: 28, marginBottom: 32, maxWidth: 500 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#8b5cf6', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  secondaryBtnText: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },

  mockupContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mockupDevice: { width: 300, height: 600, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 40, borderWidth: 8, borderColor: '#334155', padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 20, zIndex: 2 },
  fakeHeader: { width: '80%', height: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10, alignSelf: 'flex-start', marginBottom: 30, marginTop: 20 },
  fakeCard: { width: '100%', height: 120, backgroundColor: 'rgba(139, 92, 246, 0.15)', borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  fakeCardSmall: { width: '100%', height: 80, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 20, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  fakeSosBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 15 },
  mockupShadow: { position: 'absolute', bottom: -20, width: 250, height: 30, backgroundColor: '#8b5cf6', borderRadius: 15, opacity: 0.3, transform: [{ scaleY: 0.5 }] }
});
