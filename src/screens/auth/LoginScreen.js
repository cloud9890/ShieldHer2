// src/screens/auth/LoginScreen.js
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import Hoverable from '../../components/common/Hoverable';
import { Mail, Lock, ShieldCheck } from 'lucide-react-native';
import { BG_DEEP, CARD_DEEP, PRIMARY, TEXT, SUBTEXT, BORDER_VIOLET } from '../../theme/colors';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    }
    // On success, global Zustand store in App.js catches the auth state change and updates navigation
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <ShieldCheck size={56} color={PRIMARY} />
        <Text style={s.title}>Welcome Back</Text>
        <Text style={s.subtitle}>Sign in to access your safety vault</Text>
      </View>

      <View style={s.form}>
        <View style={s.inputContainer}>
          <Mail size={20} color={SUBTEXT} />
          <TextInput
            style={s.input}
            placeholder="Email Address"
            placeholderTextColor={SUBTEXT}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={s.inputContainer}>
          <Lock size={20} color={SUBTEXT} />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={SUBTEXT}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Hoverable style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>Sign In</Text>}
        </Hoverable>

        <Hoverable style={s.linkBtn} onPress={() => navigation.navigate('SignUp')}>
          <Text style={s.linkText}>Don't have an account? <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign Up</Text></Text>
        </Hoverable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DEEP, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', color: TEXT, marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 15, color: SUBTEXT },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_DEEP, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: BORDER_VIOLET },
  input: { flex: 1, marginLeft: 12, color: TEXT, fontSize: 16 },
  btn: { backgroundColor: PRIMARY, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 16, padding: 10 },
  linkText: { color: SUBTEXT, fontSize: 14 }
});
