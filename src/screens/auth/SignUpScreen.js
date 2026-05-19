// src/screens/auth/SignUpScreen.js
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../api/supabase';
import Hoverable from '../../components/common/Hoverable';
import { Mail, Lock, User, Phone } from 'lucide-react-native';
import { BG_DEEP, CARD_DEEP, PRIMARY, TEXT, SUBTEXT, BORDER_VIOLET } from '../../theme/colors';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Name, Email, and Password are required');
      return;
    }
    setLoading(true);
    
    // 1. Sign up auth user
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: name } }
    });
    
    if (error) {
      setLoading(false);
      Alert.alert('Sign Up Failed', error.message);
      return;
    }

    // 2. Insert into profiles table immediately if user created
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: data.user.id, name, phone, guard_on: true, shake_on: true }
      ]);
      if (profileError) console.error("Profile creation error:", profileError);
    }
    
    setLoading(false);
    
    if (data.session) {
      // Auto logged in - global auth state will pick it up
    } else {
      Alert.alert('Success', 'Please check your email to verify your account.');
      navigation.navigate('Login');
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join ShieldHer and stay protected</Text>
      </View>

      <View style={s.form}>
        <View style={s.inputContainer}>
          <User size={20} color={SUBTEXT} />
          <TextInput
            style={s.input}
            placeholder="Full Name"
            placeholderTextColor={SUBTEXT}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

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
          <Phone size={20} color={SUBTEXT} />
          <TextInput
            style={s.input}
            placeholder="Phone Number (Optional)"
            placeholderTextColor={SUBTEXT}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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

        <Hoverable style={s.btn} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>Sign Up</Text>}
        </Hoverable>

        <Hoverable style={s.linkBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={s.linkText}>Already have an account? <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign In</Text></Text>
        </Hoverable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DEEP, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'flex-start', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: TEXT, marginBottom: 8 },
  subtitle: { fontSize: 16, color: SUBTEXT },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_DEEP, borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: BORDER_VIOLET },
  input: { flex: 1, marginLeft: 12, color: TEXT, fontSize: 16 },
  btn: { backgroundColor: PRIMARY, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 16, padding: 10 },
  linkText: { color: SUBTEXT, fontSize: 14 }
});
