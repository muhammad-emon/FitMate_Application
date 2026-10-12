import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// sprint 2 — full ui dummy (orny)
// hardcoded workout routine, no firestore, no ai
// youtube player wired in sprint 4 when api is connected

// ─── Dummy routine ────────────────────────────────────────────────────────────

const DUMMY_ROUTINE = {
  goal:        'Gain Muscle',
  name:        'Intermediate Strength Plan',
  description: 'A balanced 4-day strength routine focused on compound lifts to build lean muscle mass.',
  daysPerWeek: 4,
  exercises: [
    { name: 'Barbell Squat',     muscleGroup: 'Legs & Glutes',    sets: 4, reps: '8-10', rest: '90s', youtubeId: 'bEv6CCg2BC8' },
    { name: 'Bench Press',       muscleGroup: 'Chest & Triceps',  sets: 4, reps: '8-10', rest: '90s', youtubeId: 'SCVCLChPQSY' },
    { name: 'Deadlift',          muscleGroup: 'Back & Hamstrings', sets: 3, reps: '6-8',  rest: '2min', youtubeId: 'op9kVnSso6Q' },
    { name: 'Pull-Up',           muscleGroup: 'Back & Biceps',    sets: 3, reps: '8-12', rest: '60s', youtubeId: 'eGo4IYlbE5g' },
    { name: 'Overhead Press',    muscleGroup: 'Shoulders',        sets: 3, reps: '10-12', rest: '60s', youtubeId: '2yjwXTZQDDI' },
    { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings',       sets: 3, reps: '10-12', rest: '60s', youtubeId: 'JCXUYuzwNrM' },
  ],
};

const GOAL_COLORS = {
  'Lose Weight':      ['#FF884B', '#cc5f2a'],
  'Gain Muscle':      ['#00C897', '#007a5c'],
  'Maintain Fitness': ['#3b82f6', '#1d4ed8'],
};

// ─── Routine banner ───────────────────────────────────────────────────────────

function RoutineBanner({ routine }) {
  const colors = GOAL_COLORS[routine.goal] || ['#00C897', '#007a5c'];
  return (
    <View style={styles.bannerCard}>
      <LinearGradient
        colors={[colors[0] + '33', colors[1] + '11']}
        style={styles.bannerGradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.bannerTop}>
          <View style={[styles.goalBadge, { backgroundColor: colors[0] + '22', borderColor: colors[0] }]}>
            <Text style={[styles.goalBadgeText, { color: colors[0] }]}>{routine.goal}</Text>
          </View>
        </View>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.routineDesc}>{routine.description}</Text>
        <View style={styles.routineMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>{routine.daysPerWeek} days / week</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>{routine.exercises.length} exercises</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, index, isPlaying, onPlay }) {
  return (
    <View style={[styles.exerciseCard, isPlaying && styles.exerciseCardActive]}>
      <View style={styles.exerciseHeader}>
        <View style={[styles.exerciseIndex, isPlaying && styles.exerciseIndexActive]}>
          <Text style={[styles.exerciseIndexText, isPlaying && { color: '#fff' }]}>
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.muscleGroup}>{exercise.muscleGroup}</Text>
        </View>
        <TouchableOpacity
          style={[styles.watchBtn, isPlaying && styles.watchBtnActive]}
          onPress={onPlay}
          activeOpacity={0.8}
        >
          <Text style={styles.watchBtnText}>
            {isPlaying ? '✕ Close' : '▶ Watch'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.setsRow}>
        <View style={styles.badge}><Text style={styles.badgeText}>{exercise.sets} sets</Text></View>
        <View style={styles.badge}><Text style={styles.badgeText}>{exercise.reps} reps</Text></View>
        <View style={styles.badge}><Text style={styles.badgeText}>{exercise.rest} rest</Text></View>
      </View>

      {/* video placeholder — youtube player connected in sprint 4 */}
      {isPlaying && (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderIcon}>▶</Text>
          <Text style={styles.videoPlaceholderText}>Video player coming in Sprint 4</Text>
          <Text style={styles.videoPlaceholderSub}>YouTube ID: {exercise.youtubeId}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const [activeId, setActiveId] = useState(null);

  function handlePlay(exercise) {
    setActiveId(prev => prev === exercise.name ? null : exercise.name);
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>💪 Your Workout Plan</Text>

        <RoutineBanner routine={DUMMY_ROUTINE} />

        {/* Why this plan */}
        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>ℹ️ Why this plan?</Text>
          <Text style={styles.whyText}>
            This routine was selected based on your fitness goal, activity level, and BMI.
            Update your profile anytime to get a different recommendation.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Exercises — tap ▶ Watch to see a tutorial</Text>

        {DUMMY_ROUTINE.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            index={i}
            isPlaying={activeId === ex.name}
            onPlay={() => handlePlay(ex)}
          />
        ))}

        {/* Save plan button */}
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#00C897', '#FF884B']} style={styles.saveBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.saveBtnText}>💾 Save Workout Plan</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:               { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 14 },
  pageTitle:            { fontSize: 24, fontWeight: '800', color: '#fff' },
  bannerCard:           { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#2C2C2C' },
  bannerGradient:       { padding: 20, gap: 8 },
  bannerTop:            { flexDirection: 'row' },
  goalBadge:            { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  goalBadgeText:        { fontSize: 12, fontWeight: '800' },
  routineName:          { fontSize: 22, fontWeight: '800', color: '#fff' },
  routineDesc:          { color: '#9E9E9E', fontSize: 13, lineHeight: 20 },
  routineMeta:          { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem:             { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaIcon:             { fontSize: 14 },
  metaText:             { color: '#E0E0E0', fontSize: 13, fontWeight: '600' },
  whyCard:              { backgroundColor: '#1E1E1E', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  whyTitle:             { color: '#00C897', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  whyText:              { color: '#666666', fontSize: 13, lineHeight: 20 },
  sectionTitle:         { color: '#9E9E9E', fontSize: 13, fontWeight: '700' },
  exerciseCard:         { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', gap: 12 },
  exerciseCardActive:   { borderColor: '#00C897' },
  exerciseHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseIndex:        { width: 34, height: 34, borderRadius: 10, backgroundColor: '#003d2e', justifyContent: 'center', alignItems: 'center' },
  exerciseIndexActive:  { backgroundColor: '#00C897' },
  exerciseIndexText:    { color: '#00C897', fontWeight: '800', fontSize: 14 },
  exerciseName:         { color: '#fff', fontSize: 16, fontWeight: '700' },
  muscleGroup:          { color: '#666666', fontSize: 12, marginTop: 2 },
  watchBtn:             { backgroundColor: '#003d2e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#00C897' },
  watchBtnActive:       { backgroundColor: '#2C2C2C', borderColor: '#555555' },
  watchBtnText:         { color: '#00C897', fontSize: 12, fontWeight: '700' },
  setsRow:              { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge:                { backgroundColor: '#121212', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2C' },
  badgeText:            { color: '#9E9E9E', fontSize: 12 },
  videoPlaceholder:     { backgroundColor: '#0a0a0a', borderRadius: 12, height: 160, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2C2C2C', gap: 6 },
  videoPlaceholderIcon: { fontSize: 36, color: '#333' },
  videoPlaceholderText: { color: '#444', fontSize: 13, fontWeight: '600' },
  videoPlaceholderSub:  { color: '#333', fontSize: 11 },
  saveBtn:              { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnGradient:      { paddingVertical: 16, alignItems: 'center' },
  saveBtnText:          { color: '#fff', fontSize: 16, fontWeight: '700' },
});
