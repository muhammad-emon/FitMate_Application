import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { logOut } from '../services/authService';
import { saveUserProfile, getUserProfile, saveFastingSession, getFastingHistory } from '../services/firestoreService';
import { FASTING_PROTOCOLS, getFastDurationMs, formatCountdown, getFastProgress } from '../utils/fastingUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOALS = [
  { value: 'lose', label: '🔥 Lose Weight' },
  { value: 'maintain', label: '⚖️ Maintain' },
  { value: 'gain', label: '💪 Gain Muscle' },
];
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Lightly Active' },
  { value: 'moderate', label: 'Moderately Active' },
  { value: 'active', label: 'Very Active' },
  { value: 'very_active', label: 'Extremely Active' },
];

export default function ProfileScreen({ navigation }) {
  const uid = auth.currentUser?.uid;

  // Profile fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('maintain');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [dietType, setDietType] = useState('balanced');
  const [allergies, setAllergies] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fasting state
  const [fastingProtocol, setFastingProtocol] = useState('16:8');
  const [fastingActive, setFastingActive] = useState(false);
  const [fastStartTime, setFastStartTime] = useState(null);
  const [countdown, setCountdown] = useState('00:00:00');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [fastingHistory, setFastingHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Guard: prevent double-firing when timer hits 0
  const completionFiredRef = useRef(false);

  useEffect(() => {
    loadProfile();
    restoreTimer();
  }, []);

  // Live countdown ticker
  useEffect(() => {
    if (!fastingActive || !fastStartTime) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - fastStartTime;
      const total = getFastDurationMs(fastingProtocol);
      const remaining = Math.max(total - elapsed, 0);
      setCountdown(formatCountdown(remaining));
      if (remaining === 0 && !completionFiredRef.current) {
        completionFiredRef.current = true;
        stopFast(false); // natural completion — don't cancel notification, let it fire
        if (notifEnabled) {
          Alert.alert(
            '🎉 Fast Complete!',
            `You've completed your ${fastingProtocol} fast! Great discipline — time to break your fast.`
          );
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fastingActive, fastStartTime, fastingProtocol]);

  async function loadProfile() {
    try {
      const data = await getUserProfile(uid);
      if (data) {
        // Support web-app field names and normalize casing
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName;
        setName(data.name || data.fullName || data.displayName || fullName || '');
        setAge(String(data.age || ''));
        const g = (data.gender || 'male').toLowerCase();
        setGender(g === 'm' || g.includes('male') ? 'male' : 'female');
        setHeight(String(data.height || ''));
        setWeight(String(data.weight || ''));
        // Normalize goal: 'Lose Weight'→'lose', 'lose_weight'→'lose'
        const rawGoal = (data.goal || data.fitnessGoal || 'maintain').toLowerCase();
        if (rawGoal.includes('lose') || rawGoal.includes('loss')) setGoal('lose');
        else if (rawGoal.includes('gain') || rawGoal.includes('muscle')) setGoal('gain');
        else setGoal('maintain');
        // Normalize activity level — web app stores numeric multiplier like "1.55"
        const rawAct = String(data.activityLevel || data.activity || 'moderate').toLowerCase();
        const actNum = parseFloat(rawAct);
        if (!isNaN(actNum)) {
          if (actNum <= 1.2) setActivityLevel('sedentary');
          else if (actNum <= 1.375) setActivityLevel('light');
          else if (actNum <= 1.55) setActivityLevel('moderate');
          else if (actNum <= 1.725) setActivityLevel('active');
          else setActivityLevel('very_active');
        } else {
          if (rawAct.includes('sedentary')) setActivityLevel('sedentary');
          else if (rawAct.includes('light')) setActivityLevel('light');
          else if (rawAct.includes('very') || rawAct.includes('extreme')) setActivityLevel('very_active');
          else if (rawAct.includes('active')) setActivityLevel('active');
          else setActivityLevel('moderate');
        }
        setDietType(data.dietType || data.diet_type || 'balanced');
        setAllergies(data.allergies || '');
        setFastingProtocol(data.fastingProtocol || '16:8');
      }
      const history = await getFastingHistory(uid);
      setFastingHistory(history);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function restoreTimer() {
    try {
      const start = await AsyncStorage.getItem('fastStartTime');
      const protocol = await AsyncStorage.getItem('fastProtocol');
      if (start) {
        setFastStartTime(Number(start));
        setFastingProtocol(protocol || '16:8');
        setFastingActive(true);
      }
    } catch (e) {}
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name before saving.');
      return;
    }
    setSaving(true);
    try {
      await saveUserProfile(uid, {
        name: name.trim(), age, gender, height, weight,
        goal, activityLevel, dietType, allergies,
        fastingProtocol,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('✅ Saved', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Could not save profile. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function startFast() {
    const now = Date.now();
    completionFiredRef.current = false;
    setFastStartTime(now);
    setFastingActive(true);
    await AsyncStorage.setItem('fastStartTime', String(now));
    await AsyncStorage.setItem('fastProtocol', fastingProtocol);
  }

  async function stopFast() {
    if (!fastStartTime) return;
    const end = Date.now();
    const durationMinutes = Math.floor((end - fastStartTime) / 60000);

    try {
      await saveFastingSession(uid, {
        protocol: fastingProtocol,
        startTime: new Date(fastStartTime).toISOString(),
        endTime: new Date(end).toISOString(),
        durationMinutes,
      });
      const history = await getFastingHistory(uid);
      setFastingHistory(history);
    } catch (e) {}
    setFastingActive(false);
    setFastStartTime(null);
    setCountdown('00:00:00');
    await AsyncStorage.removeItem('fastStartTime');
    await AsyncStorage.removeItem('fastProtocol');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👤 Profile</Text>
          <TouchableOpacity onPress={() => logOut()} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ── Personal Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.required}>* required</Text>
          </View>
          <TextInput
            style={[styles.input, !name.trim() && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor="#555555"
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Age</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge}
                placeholder="25" placeholderTextColor="#555555" keyboardType="numeric" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {['male', 'female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g === 'male' ? '♂ Male' : '♀ Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput style={styles.input} value={height} onChangeText={setHeight}
                placeholder="175" placeholderTextColor="#555555" keyboardType="numeric" />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput style={styles.input} value={weight} onChangeText={setWeight}
                placeholder="70" placeholderTextColor="#555555" keyboardType="numeric" />
            </View>
          </View>
        </View>

        {/* ── Fitness Goals ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Goals</Text>

          <Text style={styles.label}>Goal</Text>
          <View style={styles.pillsRow}>
            {GOALS.map(({ value, label }) => (
              <TouchableOpacity key={value}
                style={[styles.pill, goal === value && styles.pillActive]}
                onPress={() => setGoal(value)}
              >
                <Text style={[styles.pillText, goal === value && styles.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Activity Level</Text>
          {ACTIVITY_LEVELS.map(({ value, label }) => (
            <TouchableOpacity key={value}
              style={[styles.activityBtn, activityLevel === value && styles.activityBtnActive]}
              onPress={() => setActivityLevel(value)}
            >
              <Text style={[styles.activityText, activityLevel === value && styles.activityTextActive]}>
                {label}
              </Text>
              {activityLevel === value && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>Diet Type</Text>
          <View style={styles.pillsRow}>
            {['balanced', 'vegetarian', 'vegan', 'keto'].map((t) => (
              <TouchableOpacity key={t}
                style={[styles.pill, dietType === t && styles.pillActive]}
                onPress={() => setDietType(t)}
              >
                <Text style={[styles.pillText, dietType === t && styles.pillTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Allergies / Dislikes</Text>
          <TextInput style={styles.input} value={allergies} onChangeText={setAllergies}
            placeholder="e.g. peanuts, dairy" placeholderTextColor="#555555" />
        </View>

        {/* ── Intermittent Fasting ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Intermittent Fasting</Text>

          {/* Protocol selector */}
          <Text style={styles.label}>Protocol</Text>
          <View style={styles.pillsRow}>
            {Object.entries(FASTING_PROTOCOLS).map(([key, val]) => (
              <TouchableOpacity key={key}
                style={[styles.pill, fastingProtocol === key && styles.pillActive]}
                onPress={() => !fastingActive && setFastingProtocol(key)}
              >
                <Text style={[styles.pillText, fastingProtocol === key && styles.pillTextActive]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.protocolDesc}>
            {FASTING_PROTOCOLS[fastingProtocol]?.label} — Fast {FASTING_PROTOCOLS[fastingProtocol]?.fast}h, eat {FASTING_PROTOCOLS[fastingProtocol]?.eat}h
          </Text>

          {/* Timer display */}
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>{fastingActive ? '🔴 Fasting' : '⚪ Not Fasting'}</Text>
            <Text style={styles.timerDisplay}>{fastingActive ? countdown : '--:--:--'}</Text>

            <TouchableOpacity
              style={[styles.timerBtn, fastingActive && styles.timerBtnStop]}
              onPress={fastingActive ? stopFast : startFast}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={fastingActive ? ['#dc2626', '#b91c1c'] : ['#00C897', '#FF884B']}
                style={styles.timerBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.timerBtnText}>
                  {fastingActive ? '⏹ Stop Fast' : '▶ Start Fast'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>Notifications</Text>
              <Switch value={notifEnabled} onValueChange={setNotifEnabled}
                trackColor={{ false: '#2C2C2C', true: '#00C897' }} thumbColor="#fff" />
            </View>
          </View>

          {/* Fasting history */}
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={styles.historyToggleText}>
              {showHistory ? '▲ Hide History' : '▼ Show Fasting History'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historyList}>
              {fastingHistory.length === 0 ? (
                <Text style={styles.noHistory}>No fasting sessions yet.</Text>
              ) : (
                fastingHistory.map((s, i) => (
                  <View key={s.id || i} style={styles.historyItem}>
                    <Text style={styles.historyProtocol}>{s.protocol}</Text>
                    <Text style={styles.historyDuration}>{s.durationMinutes} min</Text>
                    <Text style={styles.historyDate}>
                      {s.startTime ? new Date(s.startTime).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Manage Subscription */}
        <TouchableOpacity
          style={styles.subscriptionBtn}
          onPress={() => navigation?.navigate('Subscription')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1E1E1E', '#2C2C2C']} style={styles.subscriptionBtnInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.subscriptionBtnIcon}>👑</Text>
            <Text style={styles.subscriptionBtnText}>Manage Subscription</Text>
            <Text style={styles.subscriptionBtnArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00C897', '#FF884B']} style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>💾 Save Profile</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoutBtn: { backgroundColor: '#1E1E1E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  logoutText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
  section: { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 16 },
  label: { color: '#9E9E9E', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#121212', color: '#fff', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#2C2C2C',
  },
  row: { flexDirection: 'row' },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center', backgroundColor: '#121212' },
  genderBtnActive: { borderColor: '#00C897', backgroundColor: '#003d2e' },
  genderText: { color: '#666666', fontSize: 13 },
  genderTextActive: { color: '#33d4ab', fontWeight: '700' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#121212' },
  pillActive: { borderColor: '#00C897', backgroundColor: '#003d2e' },
  pillText: { color: '#666666', fontSize: 13 },
  pillTextActive: { color: '#33d4ab', fontWeight: '600' },
  activityBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#121212', marginBottom: 6 },
  activityBtnActive: { borderColor: '#00C897', backgroundColor: '#003d2e' },
  activityText: { color: '#666666', fontSize: 14 },
  activityTextActive: { color: '#33d4ab', fontWeight: '600' },
  checkmark: { color: '#00C897', fontWeight: '700' },
  protocolDesc: { color: '#666666', fontSize: 12, marginTop: 6, marginBottom: 8 },
  timerCard: { backgroundColor: '#121212', borderRadius: 16, padding: 20, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#2C2C2C', marginTop: 8 },
  timerLabel: { color: '#9E9E9E', fontSize: 13, fontWeight: '600' },
  timerDisplay: { fontSize: 44, fontWeight: '800', color: '#fff', letterSpacing: 3 },
  timerBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  timerBtnStop: {},
  timerBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  timerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  notifLabel: { color: '#9E9E9E', fontSize: 14 },
  historyToggle: { marginTop: 14, alignItems: 'center' },
  historyToggleText: { color: '#00C897', fontSize: 13, fontWeight: '600' },
  historyList: { marginTop: 10, gap: 8 },
  noHistory: { color: '#555555', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#121212', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  historyProtocol: { color: '#33d4ab', fontWeight: '700', fontSize: 13 },
  historyDuration: { color: '#9E9E9E', fontSize: 13 },
  historyDate: { color: '#555555', fontSize: 12 },
  subscriptionBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  subscriptionBtnInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: '#2C2C2C', borderRadius: 14, gap: 10 },
  subscriptionBtnIcon: { fontSize: 20 },
  subscriptionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  subscriptionBtnArrow: { color: '#9E9E9E', fontSize: 20, fontWeight: '300' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  required: { color: '#ef4444', fontSize: 11, fontWeight: '700', marginTop: 12 },
  inputError: { borderColor: '#ef4444' },
});
