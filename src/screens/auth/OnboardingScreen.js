// src/screens/auth/OnboardingScreen.js
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Hoverable from '../../components/common/Hoverable';
import { ShieldAlert, Map, LockKeyhole } from 'lucide-react-native';
import { BG_DEEP, CARD_DEEP, PRIMARY, TEXT, SUBTEXT, PINK, SUCCESS } from '../../theme/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Shake to SOS',
    description: 'Instantly alert your trusted circle and emergency services by simply shaking your device in times of danger.',
    icon: ShieldAlert,
    color: PINK
  },
  {
    id: '2',
    title: 'Guardian Mode',
    description: 'Advanced background detection for sudden impacts, panic running, and unsafe late-night routes.',
    icon: Map,
    color: PRIMARY
  },
  {
    id: '3',
    title: 'Evidence Vault',
    description: 'Automatically record and securely store encrypted audio and video evidence during emergency situations.',
    icon: LockKeyhole,
    color: SUCCESS
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  return (
    <View style={s.container}>
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
              <View style={[s.iconBox, { backgroundColor: slide.color + '1A', borderColor: slide.color + '40' }]}>
                <Icon size={80} color={slide.color} />
              </View>
              <Text style={s.title}>{slide.title}</Text>
              <Text style={s.description}>{slide.description}</Text>
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
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.8, 1.2, 0.8],
              extrapolate: 'clamp',
            });
            return <Animated.View key={i} style={[s.dot, { opacity, transform: [{ scale }] }]} />;
          })}
        </View>

        <Hoverable style={s.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={s.btnText}>Get Started</Text>
        </Hoverable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DEEP },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconBox: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: TEXT, marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 16, color: SUBTEXT, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  footer: { padding: 40, paddingBottom: 60 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  btn: { backgroundColor: PRIMARY, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnText: { color: 'white', fontSize: 18, fontWeight: '700' }
});
