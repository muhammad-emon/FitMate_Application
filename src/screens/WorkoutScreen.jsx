import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import YoutubePlayer from 'react-native-youtube-iframe';
import { auth } from '../config/firebase';
import { getUserProfile } from '../services/firestoreService';
import { selectRoutine } from '../utils/workoutSelector';

// Goal -> color mapping for the routine banner
// Each fitness goal gets its own accent color pair so the UI feels personalized
const GOAL_COLORS = {
  'Lose Weight':       ['#FF884B', '#cc5f2a'],
  'Gain Muscle':       ['#00C897', '#007a5c'],
  'Maintain Fitness':  ['#3b82f6', '#1d4ed8'],
  'Build Muscle Mass': ['#8b5cf6', '#6d28d9'],
};

// Shows a summary card at the top — goal badge, routine name, description, and quick stats
function RoutineBanner({ routine }) {
  // Fall back to the green pair if somehow a goal isn't in our map
  const colors = GOAL_COLORS[routine.goal] || ['#00C897', '#007a5c'];
  return (
    <View style={styles.bannerCard}>
      {/* Using '33' and '11' hex alpha suffixes to get a subtle tinted gradient background */}
      <LinearGradient
        colors={[colors[0] + '33', colors[1] + '11']}
        style={styles.bannerGradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.bannerTop}>
          {/* Goal badge — border and text color both pulled from the goal's color */}
          <View style={[styles.goalBadge, { backgroundColor: colors[0] + '22', borderColor: colors[0] }]}>
            <Text style={[styles.goalBadgeText, { color: colors[0] }]}>{routine.goal}</Text>
          </View>
        </View>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.routineDesc}>{routine.description}</Text>
        {/* Quick stats row — days per week and total exercise count, no emojis */}
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

// Individual exercise card — shows name, muscle group, sets/reps/rest, and optionally a YouTube embed
function ExerciseCard({ exercise, index, isPlaying, onPlay }) {
  return (
    // Highlight the card border green when its video is actively playing
    <View style={[styles.exerciseCard, isPlaying && styles.exerciseCardActive]}>
      {/* Header row */}
      <View style={styles.exerciseHeader}>
        {/* Numbered circle — turns solid green when this card is active */}
        <View style={[styles.exerciseIndex, isPlaying && styles.exerciseIndexActive]}>
          <Text style={[styles.exerciseIndexText, isPlaying && { color: '#fff' }]}>
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {/* No emoji on muscle group — sprint 2 ui decision */}
          <Text style={styles.muscleGroup}>{exercise.muscleGroup}</Text>
        </View>
        {/* Toggle button — label flips between Watch and Close depending on state */}
        <TouchableOpacity
          style={[styles.watchBtn, isPlaying && styles.watchBtnActive]}
          onPress={onPlay}
          activeOpacity={0.8}
        >
          <Text style={styles.watchBtnText}>
            {isPlaying ? 'Close' : 'Watch'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sets / reps / rest badges — no emojis, sprint 2 ui decision */}
      <View style={styles.setsRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{exercise.sets} sets</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{exercise.reps}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{exercise.rest} rest</Text>
        </View>
      </View>

      {/* Embedded YouTube tutorial — only mounts when this card is active, saves bandwidth */}
      {isPlaying && (
        <View style={styles.playerBox}>
          <YoutubePlayer
            height={210}
            videoId={exercise.youtubeId}
            play={true}
          />
        </View>
      )}
    </View>
  );
}

export default function WorkoutScreen() {
  // Grab the logged-in user's UID — we need it to fetch their profile from Firestore
  const uid = auth.currentUser?.uid;
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // tracks which exercise card has its YouTube player open — only one at a time
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    loadRoutine();
  }, []);

  async function loadRoutine() {
    try {
      const profile = await getUserProfile(uid);
      // selectRoutine picks the right workout plan based on the user's goal and BMI
      const selected = selectRoutine(profile);
      setRoutine(selected);
    } catch (e) {
      console.error('WorkoutScreen load error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Toggle the YouTube player for a card — tapping the active card closes it
  function handlePlay(exercise) {
    setActiveId(prev => (prev === exercise.name ? null : exercise.name));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
        <Text style={styles.loadingText}>Loading your workout...</Text>
      </View>
    );
  }

  if (error || !routine) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <Text style={styles.errorText}>Could not load workout.{'\n'}Complete your profile first.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Dark gradient background that fills the whole screen */}
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Page title — no emoji, sprint 2 ui decision */}
        <Text style={styles.pageTitle}>Your Workout Plan</Text>

        {/* Routine banner */}
        <RoutineBanner routine={routine} />

        {/* Why this plan card — gives users context on how the routine was selected */}
        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why this plan?</Text>
          <Text style={styles.whyText}>
            This routine was automatically selected based on your fitness goal, activity level,
            and BMI. Update your profile anytime to get a different recommendation.
          </Text>
        </View>

        {/* Exercise list */}
        <Text style={styles.sectionTitle}>
          Exercises — tap Watch to see a tutorial
        </Text>
        {/* Using exercise name as key since names are unique within a routine */}
        {routine.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            index={i}
            isPlaying={activeId === ex.name}
            onPlay={() => handlePlay(ex)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Centered layout used for both the loading spinner and the error state
  centered:           { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText:        { color: '#666666', fontSize: 13 },
  errorText:          { color: '#9E9E9E', fontSize: 15, textAlign: 'center', lineHeight: 24 },

  scroll:             { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 14 },
  pageTitle:          { fontSize: 24, fontWeight: '800', color: '#fff' },

  // Routine banner
  bannerCard:         { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#2C2C2C' },
  bannerGradient:     { padding: 20, gap: 8 },
  bannerTop:          { flexDirection: 'row' },
  goalBadge:          { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  goalBadgeText:      { fontSize: 12, fontWeight: '800' },
  routineName:        { fontSize: 22, fontWeight: '800', color: '#fff' },
  routineDesc:        { color: '#9E9E9E', fontSize: 13, lineHeight: 20 },
  routineMeta:        { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:           { color: '#E0E0E0', fontSize: 13, fontWeight: '600' },

  // Why card
  whyCard:            { backgroundColor: '#1E1E1E', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  whyTitle:           { color: '#00C897', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  whyText:            { color: '#666666', fontSize: 13, lineHeight: 20 },

  sectionTitle:       { color: '#9E9E9E', fontSize: 13, fontWeight: '700' },

  // Exercise card
  exerciseCard:       { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', gap: 12 },
  exerciseCardActive: { borderColor: '#00C897' },
  exerciseHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseIndex:      { width: 34, height: 34, borderRadius: 10, backgroundColor: '#003d2e', justifyContent: 'center', alignItems: 'center' },
  exerciseIndexActive:{ backgroundColor: '#00C897' },
  exerciseIndexText:  { color: '#00C897', fontWeight: '800', fontSize: 14 },
  exerciseName:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  muscleGroup:        { color: '#666666', fontSize: 12, marginTop: 2 },
  watchBtn:           { backgroundColor: '#003d2e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#00C897' },
  watchBtnActive:     { backgroundColor: '#2C2C2C', borderColor: '#555555' },
  watchBtnText:       { color: '#00C897', fontSize: 12, fontWeight: '700' },

  setsRow:            { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge:              { backgroundColor: '#121212', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2C' },
  badgeText:          { color: '#9E9E9E', fontSize: 12 },

  // Clip the YouTube player corners to match the card's rounded style
  playerBox:          { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
});
