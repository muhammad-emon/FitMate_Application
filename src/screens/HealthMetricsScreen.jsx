import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { getUserProfile, getDietPlan, saveDietPlan } from '../services/firestoreService';
import { analyzeHealthMetrics } from '../services/api';
import {
  calculateAllMetrics, getBMICategory,
} from '../utils/metricsCalculator';

// Map each BMI category to a color so the UI can visually signal how the user is doing
const BMI_COLORS = {
  Underweight: '#60a5fa',
  Normal: '#4ade80',
  Overweight: '#facc15',
  Obese: '#f87171',
};

// Reusable card component to display a single health metric with an icon, value, and short description
function MetricCard({ icon, label, value, unit, color, description }) {
  return (
    // Appending '44' to the color gives us a semi-transparent border that matches the accent
    <View style={[styles.card, { borderColor: color + '44' }]}>
      {/* Icon background is a very faint tint of the accent color — '22' = ~13% opacity */}
      <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={[styles.cardValue, { color }]}>
          {value} <Text style={styles.cardUnit}>{unit}</Text>
        </Text>
        {/* Only render the description line if one was actually passed in */}
        {description && <Text style={styles.cardDesc}>{description}</Text>}
      </View>
    </View>
  );
}

export default function HealthMetricsScreen({ navigation }) {
  const uid = auth.currentUser?.uid;

  // Core metric values and the BMI category string (e.g. "Normal", "Overweight")
  const [metrics, setMetrics]     = useState(null);
  const [category, setCategory]   = useState('');
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  // If the user hasn't filled out their profile yet, we show a nudge screen instead
  const [noProfile, setNoProfile] = useState(false);
  // AI Analytics state — kept separate so the main metric load stays fast
  const [analysis, setAnalysis]   = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [analyseErr, setAnalyseErr] = useState('');

  // Kick off metric calculation as soon as the screen mounts
  useEffect(() => {
    calcMetrics();
  }, []);

  // Tries to load stored metrics first for speed, falls back to calculating fresh from profile
  async function calcMetrics() {
    try {
      // ── Step 1: Load pre-stored metrics (exact web app values) ──────────
      // If we already saved metrics to Firestore, just use those — no need to recalculate
      const dietDoc = await getDietPlan(uid);
      if (dietDoc?.metrics) {
        const m = dietDoc.metrics;
        const bmi = parseFloat(m.bmi);
        setMetrics({
          bmi,
          bmr:  parseFloat(m.bmr),
          tdee: parseFloat(m.tdee),
          bfp:  parseFloat(m.bfp),
        });
        setCategory(getBMICategory(bmi));
        // Silently fetch profile in the background — we need it later for the AI analysis button
        getUserProfile(uid).then(p => p && setProfile(p)).catch(() => {});
        return;
      }

      // ── Step 2: No stored metrics — calculate fresh from profile ────────
      const profile = await getUserProfile(uid);
      // Can't calculate anything without these basics — show the incomplete profile screen
      if (!profile?.weight || !profile?.height || !profile?.age) {
        setNoProfile(true);
        return;
      }
      setProfile(profile);

      const result = calculateAllMetrics(
        parseFloat(profile.weight),
        parseFloat(profile.height),
        parseFloat(profile.age),
        profile.gender || 'male',
        profile.activityLevel || 'moderate',   // handles "1.55" OR "moderate"
      );

      setMetrics({ bmi: result.bmi, bmr: result.bmr, tdee: result.tdee, bfp: result.bfp });
      setCategory(result.category);

      // ── Step 3: Save calculated metrics back to Firestore ───────────────
      // So next load is instant and matches what the user sees on the web app too
      const existing = dietDoc || {};
      await saveDietPlan(uid, {
        ...existing,
        metrics: {
          bmi:  result.bmi,
          bmr:  result.bmr,
          tdee: result.tdee,
          bfp:  result.bfp,
        },
      });

    } catch (e) {
      console.error('calcMetrics error:', e);
      // Treat any unexpected error the same as a missing profile — better than crashing
      setNoProfile(true);
    } finally {
      setLoading(false);
    }
  }

  // Show a full-screen spinner while we're fetching from Firestore
  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  // If the profile is incomplete, send the user to fill it in before we can show anything useful
  if (noProfile) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <Text style={styles.noProfileIcon}>📋</Text>
        <Text style={styles.noProfileTitle}>Profile Incomplete</Text>
        <Text style={styles.noProfileMsg}>
          Please fill in your height, weight, age, and gender in your profile first.
        </Text>
        <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.navigate('Profile')}>
          <LinearGradient colors={['#00C897', '#FF884B']} style={styles.updateBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.updateBtnText}>Update Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Pick the right accent color for the BMI banner based on the user's category
  const bmiColor = BMI_COLORS[category] || '#00C897';

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>📊 Health Metrics</Text>
        <Text style={styles.pageSubtitle}>Your stored metrics from FitMate</Text>

        {/* BMI Banner — big focal point at the top so the user sees their BMI at a glance */}
        <View style={[styles.bmiBanner, { borderColor: bmiColor + '66' }]}>
          <LinearGradient
            colors={[bmiColor + '22', bmiColor + '11']}
            style={styles.bmiBannerGradient}
          >
            <Text style={styles.bmiTitle}>Body Mass Index</Text>
            <Text style={[styles.bmiValue, { color: bmiColor }]}>
              {metrics.bmi.toFixed(1)}
            </Text>
            {/* Pill-shaped badge showing the category label (Normal, Overweight, etc.) */}
            <View style={[styles.categoryBadge, { backgroundColor: bmiColor + '33', borderColor: bmiColor + '66' }]}>
              <Text style={[styles.categoryText, { color: bmiColor }]}>{category}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Metric Cards — BMR, TDEE, and BFP each get their own card with a distinct color */}
        <MetricCard
          icon="🔥"
          label="Basal Metabolic Rate (BMR)"
          value={Math.round(metrics.bmr)}
          unit="kcal/day"
          color="#f97316"
          description="Calories your body burns at complete rest"
        />
        <MetricCard
          icon="⚡"
          label="Total Daily Energy Expenditure (TDEE)"
          value={Math.round(metrics.tdee)}
          unit="kcal/day"
          color="#00C897"
          description="Calories you burn per day with your activity level"
        />
        <MetricCard
          icon="💧"
          label="Body Fat Percentage (BFP)"
          value={metrics.bfp.toFixed(1)}
          unit="%"
          color="#06b6d4"
          description="Estimated using the Deurenberg formula"
        />

        {/* Small disclaimer so users know these are estimates, not medical readings */}
        <View style={styles.infoNote}>
          <Text style={styles.infoText}>
            ℹ️ These values are estimates based on the Mifflin-St Jeor equation. Update your profile to recalculate.
          </Text>
        </View>

        {/* ── AI Analytics Section ── */}
        {/* This whole block is lazy — nothing hits the API until the user taps the button */}
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>🤖 AI Health Analysis</Text>
            <Text style={styles.analyticsSubtitle}>Powered by OpenAI</Text>
          </View>

          {/* Only show the "Analyse" button if we don't have results yet and aren't already loading */}
          {!analysis && !analysing && (
            <TouchableOpacity
              style={styles.analyseBtn}
              onPress={async () => {
                setAnalysing(true);
                setAnalyseErr('');
                try {
                  // Pass the full profile + computed metrics so the AI has proper context
                  const result = await analyzeHealthMetrics(profile, metrics, category);
                  setAnalysis(result);
                } catch (e) {
                  setAnalyseErr('Could not generate analysis. Please try again.');
                } finally {
                  setAnalysing(false);
                }
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00C897', '#FF884B']}
                style={styles.analyseBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.analyseBtnText}>✨ Analyse My Health</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Spinner + message shown while waiting for the OpenAI response */}
          {analysing && (
            <View style={styles.analysingBox}>
              <ActivityIndicator color="#00C897" size="small" />
              <Text style={styles.analysingText}>Zenith is analysing your metrics…</Text>
            </View>
          )}

          {/* Show error only when there's actually something to display */}
          {analyseErr !== '' && (
            <Text style={styles.analyseErr}>{analyseErr}</Text>
          )}

          {/* Full analysis results — rendered only after the API responds successfully */}
          {analysis && (
            <View style={{ gap: 14 }}>
              {/* Health Score — circular badge with a score out of 100 */}
              <View style={styles.scoreRow}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>{analysis.overallScore}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreLabel}>{analysis.scoreLabel}</Text>
                  <Text style={styles.scoreSummary}>{analysis.summary}</Text>
                </View>
              </View>

              {/* Per-metric insights — each one gets a status badge color based on Good/Warning/Critical */}
              <Text style={styles.analyticsSection}>Metric Insights</Text>
              {analysis.insights?.map((ins, i) => {
                // Map status string to a color — anything not Good or Warning is treated as Critical (red)
                const statusColor = ins.status === 'Good' ? '#00C897' : ins.status === 'Warning' ? '#FF884B' : '#ef4444';
                return (
                  <View key={i} style={styles.insightRow}>
                    <Text style={styles.insightIcon}>{ins.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <Text style={styles.insightMetric}>{ins.metric}</Text>
                        {/* Colored pill badge for status — uses the same hex-opacity trick as the cards */}
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>{ins.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.insightText}>{ins.insight}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Numbered list of AI-generated recommendations */}
              <Text style={styles.analyticsSection}>Recommendations</Text>
              {analysis.recommendations?.map((rec, i) => (
                <View key={i} style={styles.recRow}>
                  {/* Using the index + 1 as a styled circular bullet instead of a plain list dot */}
                  <Text style={styles.recBullet}>{i + 1}</Text>
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}

              {/* Goal advice — a dedicated card so it visually stands out from the bullet list */}
              <View style={styles.goalAdviceCard}>
                <Text style={styles.goalAdviceLabel}>🎯 Goal Advice</Text>
                <Text style={styles.goalAdviceText}>{analysis.goalAdvice}</Text>
              </View>

              {/* Clearing analysis lets the user fetch a fresh one without reloading the screen */}
              <TouchableOpacity
                onPress={() => setAnalysis(null)}
                style={styles.reAnalyseBtn}
              >
                <Text style={styles.reAnalyseBtnText}>🔄 Re-analyse</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom CTA — always visible so users can easily update their profile to refresh metrics */}
        <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.navigate('Profile')}>
          <LinearGradient colors={['#00C897', '#FF884B']} style={styles.updateBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.updateBtnText}>Update Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 14 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  pageSubtitle: { color: '#666666', fontSize: 13, marginBottom: 8 },
  bmiBanner: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  bmiBannerGradient: { padding: 24, alignItems: 'center', gap: 8 },
  bmiTitle: { color: '#9E9E9E', fontSize: 14, fontWeight: '600' },
  bmiValue: { fontSize: 56, fontWeight: '800' },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 14, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1,
  },
  cardIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 24 },
  cardLabel: { color: '#9E9E9E', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '800' },
  cardUnit: { fontSize: 13, fontWeight: '400', color: '#666666' },
  cardDesc: { color: '#555555', fontSize: 12, marginTop: 4 },
  infoNote: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  infoText: { color: '#666666', fontSize: 12, lineHeight: 18 },
  noProfileIcon: { fontSize: 52 },
  noProfileTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  noProfileMsg: { color: '#9E9E9E', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  updateBtn: { borderRadius: 14, overflow: 'hidden' },
  updateBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Analytics
  analyticsCard: {
    backgroundColor: '#1E1E1E', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#2C2C2C', gap: 14,
  },
  analyticsHeader: { gap: 2 },
  analyticsTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  analyticsSubtitle: { color: '#555555', fontSize: 11 },
  analyseBtn: { borderRadius: 14, overflow: 'hidden' },
  analyseBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  analyseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  analysingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  analysingText: { color: '#9E9E9E', fontSize: 13 },
  analyseErr: { color: '#ef4444', fontSize: 13, textAlign: 'center' },

  // Score
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#003d2e',
    borderWidth: 2, borderColor: '#00C897',
    justifyContent: 'center', alignItems: 'center',
  },
  scoreNumber: { color: '#00C897', fontSize: 24, fontWeight: '800' },
  scoreMax: { color: '#555555', fontSize: 10, textAlign: 'center' },
  scoreLabel: { color: '#E0E0E0', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scoreSummary: { color: '#9E9E9E', fontSize: 12, lineHeight: 18 },

  // Insights
  analyticsSection: { color: '#666666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  insightRow: {
    flexDirection: 'row', gap: 12, backgroundColor: '#121212',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2C2C2C',
  },
  insightIcon: { fontSize: 22 },
  insightMetric: { color: '#E0E0E0', fontSize: 13, fontWeight: '700' },
  insightText: { color: '#9E9E9E', fontSize: 12, lineHeight: 18 },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Recommendations
  recRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  recBullet: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#00C89722',
    color: '#00C897', fontSize: 11, fontWeight: '800',
    textAlign: 'center', lineHeight: 22,
  },
  recText: { flex: 1, color: '#9E9E9E', fontSize: 13, lineHeight: 20 },

  // Goal advice
  goalAdviceCard: {
    backgroundColor: '#003d2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#00C897',
  },
  goalAdviceLabel: { color: '#00C897', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  goalAdviceText: { color: '#E0E0E0', fontSize: 13, lineHeight: 20 },

  reAnalyseBtn: { alignItems: 'center', paddingVertical: 8 },
  reAnalyseBtnText: { color: '#555555', fontSize: 13, fontWeight: '600' },
});
