import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* background */}
      <LinearGradient
        colors={['#121212', '#181818', '#121212']}
        style={StyleSheet.absoluteFill}
      />

      {/* logo and app name */}
      <View style={styles.heroSection}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
        <Text style={styles.appName}>FitMate</Text>
        <Text style={styles.tagline}>Your AI-Powered Fitness{'\n'}&amp; Nutrition Companion</Text>
      </View>

      {/* small tags for the main features */}
      <View style={styles.pillsRow}>
        {['🥗 Diet Plans', '🤖 AI Coach', '🏋️ Workouts'].map((f) => (
          <View key={f} style={styles.pill}>
            <Text style={styles.pillText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* login / signup */}
      <View style={styles.buttonsSection}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#00C897', '#FF884B']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.primaryBtnText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Create Account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Your fitness journey starts here 🚀
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60 },
  heroSection: { alignItems: 'center', marginTop: 40 },
  logoImage: {
    width: 110, height: 110, borderRadius: 55,
    marginBottom: 20,
    shadowColor: '#00C897', shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },
  appName: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 16, color: '#9E9E9E', textAlign: 'center', marginTop: 10, lineHeight: 24 },
  pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 },
  pill: {
    backgroundColor: '#1E1E1E', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: '#2C2C2C',
  },
  pillText: { color: '#C8C8C8', fontSize: 13 },
  buttonsSection: { width: '100%', paddingHorizontal: 30, gap: 14 },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  btnGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 16, alignItems: 'center', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#00C897',
  },
  secondaryBtnText: { color: '#00C897', fontSize: 17, fontWeight: '700' },
  footerText: { color: '#555555', fontSize: 13 },
});
