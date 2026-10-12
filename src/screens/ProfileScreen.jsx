import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { logOut } from '../services/authService';

// sprint 2 — ui only, no firestore yet
// full form: name, age, gender, height, weight, goal, activity, diet type, allergies
// save button is stubbed (alerts success, no actual db call)

const GOALS = [
  { value: 'lose',     label: 'Lose Weight' },
  { value: 'maintain', label: 'Maintain'    },
  { value: 'gain',     label: 'Gain Muscle' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary'           },
  { value: 'light',       label: 'Lightly Active'      },
  { value: 'moderate',    label: 'Moderately Active'   },
  { value: 'active',      label: 'Very Active'         },
  { value: 'very_active', label: 'Extremely Active'    },
];

export default function ProfileScreen() {
  const [name,          setName]          = useState('');
  const [age,           setAge]           = useState('');
  const [gender,        setGender]        = useState('male');
  const [height,        setHeight]        = useState('');
  const [weight,        setWeight]        = useState('');
  const [goal,          setGoal]          = useState('maintain');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [dietType,      setDietType]      = useState('balanced');
  const [allergies,     setAllergies]     = useState('');

  // stub save — firestore wired in sprint 4 (main's task)
  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    Alert.alert('Saved!', 'Profile looks good. (Will connect to database in Sprint 4)');
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👤 Profile</Text>
          <TouchableOpacity onPress={logOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
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

        {/* Fitness Goals */}
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

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00C897', '#FF884B']} style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:            { padding: 20, paddingTop: 56, paddingBottom: 60 },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:             { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoutBtn:         { backgroundColor: '#1E1E1E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  logoutText:        { color: '#f87171', fontSize: 13, fontWeight: '600' },
  section:           { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  sectionTitle:      { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 16 },
  label:             { color: '#9E9E9E', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  labelRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  required:          { color: '#ef4444', fontSize: 11, fontWeight: '700', marginTop: 12 },
  input:             { backgroundColor: '#121212', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#2C2C2C' },
  inputError:        { borderColor: '#ef4444' },
  row:               { flexDirection: 'row' },
  genderRow:         { flexDirection: 'row', gap: 8 },
  genderBtn:         { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center', backgroundColor: '#121212' },
  genderBtnActive:   { borderColor: '#00C897', backgroundColor: '#003d2e' },
  genderText:        { color: '#666666', fontSize: 13 },
  genderTextActive:  { color: '#33d4ab', fontWeight: '700' },
  pillsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:              { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#121212' },
  pillActive:        { borderColor: '#00C897', backgroundColor: '#003d2e' },
  pillText:          { color: '#666666', fontSize: 13 },
  pillTextActive:    { color: '#33d4ab', fontWeight: '600' },
  activityBtn:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#121212', marginBottom: 6 },
  activityBtnActive: { borderColor: '#00C897', backgroundColor: '#003d2e' },
  activityText:      { color: '#666666', fontSize: 14 },
  activityTextActive:{ color: '#33d4ab', fontWeight: '600' },
  checkmark:         { color: '#00C897', fontWeight: '700' },
  saveBtn:           { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  saveBtnGradient:   { paddingVertical: 16, alignItems: 'center' },
  saveBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});
