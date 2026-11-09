import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { saveFeedback } from '../services/firestoreService';

// Maps star index (1–5) to a human-readable label with emoji — index 0 is empty so we can use rating value directly
const RATING_LABELS = ['', 'Terrible 😞', 'Poor 😕', 'Okay 😐', 'Good 😊', 'Excellent 🤩'];

export default function FeedbackScreen() {
  // Grab the current user's ID upfront — we need it when saving feedback
  const uid = auth.currentUser?.uid;
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Once submitted successfully, we swap to a thank-you screen instead of staying on the form
  const [submitted, setSubmitted] = useState(false);

  // Validates the form, saves feedback to Firestore, then flips to the success view
  async function handleSubmit() {
    // Don't let the user submit without picking a star rating
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    // A 5-char minimum keeps junk like "ok" or "bad" from getting through
    if (message.trim().length < 5) {
      Alert.alert('Message too short', 'Please write at least a few words about your experience.');
      return;
    }

    setSubmitting(true);
    try {
      await saveFeedback(uid, rating, message.trim());
      setSubmitted(true);
    } catch (e) {
      console.error('Feedback error:', e.message);
      Alert.alert('Error', 'Could not submit feedback. Please check your connection and try again.');
    } finally {
      // Always turn off the spinner regardless of success or failure
      setSubmitting(false);
    }
  }

  // Resets everything back to defaults so the user can submit a fresh piece of feedback
  function handleReset() {
    setRating(0);
    setMessage('');
    setSubmitted(false);
  }

  // Show a simple thank-you screen after successful submission instead of staying on the form
  if (submitted) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <StatusBar barStyle="light-content" />
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Thank you!</Text>
        <Text style={styles.successMsg}>
          Your feedback has been saved. It helps us make FitMate better for everyone.
        </Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <LinearGradient colors={['#00C897', '#FF884B']} style={styles.resetBtnGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.resetBtnText}>Submit Another</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // KeyboardAvoidingView makes sure the input isn't hidden behind the keyboard on iOS
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <StatusBar barStyle="light-content" />

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Text style={styles.title}>💬 Send Feedback</Text>
          <Text style={styles.subtitle}>Help us improve FitMate for you</Text>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>How would you rate the app?</Text>
            <View style={styles.starsRow}>
              {/* Render 5 stars; a star is "active" (highlighted) if its value is <= current rating */}
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Only show the rating label once the user has actually tapped a star */}
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}
          </View>

          {/* Message */}
          <View style={styles.messageSection}>
            <Text style={styles.sectionLabel}>Tell us more</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="What did you like? What can we improve? Any bugs you found?"
              placeholderTextColor="#555555"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            {/* Live character counter — 500 chars should be more than enough for feedback */}
            <Text style={styles.charCount}>{message.length}/500</Text>
          </View>

          {/* Category chips */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionLabel}>What are you commenting on? (optional)</Text>
            <View style={styles.chipsRow}>
              {/* Tapping a chip appends a tag to the message, e.g. "[UI Design]" */}
              {['UI Design', 'Diet Plan', 'Workout', 'AI Coach', 'Health Metrics', 'Performance', 'Bug Report'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.chip}
                  onPress={() => setMessage((prev) => prev ? `${prev} [${chip}]` : `[${chip}] `)}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit — button stays greyed out until a star rating is chosen */}
          <TouchableOpacity
            style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.85}
          >
            {/* Gradient only kicks in once a rating is selected, reinforcing that the button is now active */}
            <LinearGradient
              colors={rating > 0 ? ['#00C897', '#FF884B'] : ['#1E1E1E', '#1E1E1E']}
              style={styles.submitBtnGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Submit Feedback</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            🔒 Your feedback is saved securely to our database and reviewed by the team.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 20 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#666666', fontSize: 14, marginTop: -12 },
  sectionLabel: { color: '#9E9E9E', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  ratingSection: { gap: 8 },
  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 42, color: '#2C2C2C' },
  starActive: { color: '#f59e0b' },
  ratingLabel: { color: '#f59e0b', fontSize: 16, fontWeight: '700' },
  messageSection: { gap: 8 },
  messageInput: {
    backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16,
    color: '#fff', fontSize: 14, lineHeight: 22, minHeight: 140,
    borderWidth: 1, borderColor: '#2C2C2C',
  },
  charCount: { color: '#555555', fontSize: 12, textAlign: 'right' },
  categorySection: { gap: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1E1E1E', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#2C2C2C',
  },
  chipText: { color: '#9E9E9E', fontSize: 13 },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  privacyNote: { color: '#2C2C2C', fontSize: 12, textAlign: 'center' },
  successIcon: { fontSize: 64 },
  successTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  successMsg: { color: '#9E9E9E', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  resetBtn: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  resetBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
