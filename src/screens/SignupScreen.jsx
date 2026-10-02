import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signUp } from '../services/authService';
import { saveUserProfile } from '../services/firestoreService';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // one toggle for both password boxes

  async function handleSignup() {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    // firebase rejects short passwords anyway, this just gives a nicer message
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = await signUp(email.trim(), password);
      // store name and email right away so the profile doc exists
      await saveUserProfile(user.uid, {
        name: name.trim(),
        email: email.trim(),
        createdAt: new Date().toISOString(),
      });
      // no navigate needed, the auth listener will move us forward
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
        err.code === 'auth/invalid-email' ? 'Invalid email address.' :
        err.code === 'auth/weak-password' ? 'Password is too weak.' :
        'Sign up failed. Please try again.';
      Alert.alert('Sign Up Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your fitness journey today</Text>
        </View>

        <View style={styles.form}>
          {/* name and email look the same so one map handles both */}
          {[
            { label: 'Full Name', value: name, setter: setName, placeholder: 'John Doe', type: 'default' },
            { label: 'Email', value: email, setter: setEmail, placeholder: 'you@example.com', type: 'email-address' },
          ].map(({ label, value, setter, placeholder, type }) => (
            <View key={label}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#555555"
                keyboardType={type}
                autoCapitalize={type === 'email-address' ? 'none' : 'words'}
                value={value}
                onChangeText={setter}
              />
            </View>
          ))}

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Min. 6 characters"
              placeholderTextColor="#555555"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat your password"
            placeholderTextColor="#555555"
            secureTextEntry={!showPassword}
            value={confirm}
            onChangeText={setConfirm}
          />

          <TouchableOpacity
            style={styles.signupBtn}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#00C897', '#FF884B']}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.signupBtnText}>Create Account</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  backBtn: { marginTop: 60, marginBottom: 20 },
  backText: { color: '#00C897', fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#9E9E9E', marginTop: 6 },
  form: { gap: 4 },
  label: { color: '#9E9E9E', fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#1E1E1E', color: '#fff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#2C2C2C',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  eyeText: { fontSize: 18 },
  signupBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 24, marginBottom: 20 },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  signupBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginPrompt: { color: '#666666', fontSize: 14 },
  loginLink: { color: '#00C897', fontSize: 14, fontWeight: '700' },
});
