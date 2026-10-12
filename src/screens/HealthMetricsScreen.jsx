import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// sprint 2 — full ui with dummy data (khademul)
// everything is hardcoded / stubbed — real data & api wired in later sprints

// ─── Dummy data ───────────────────────────────────────────────────────────────

const DUMMY_METRICS = {
  bmi:      0,
  bmr:      0,
  tdee:     0,
  bfp:      0,
  category: 'N/A',
};

const DUMMY_ANALYSIS = {
  overallScore: 0,
  scoreLabel:   'N/A',
  summary:      'XYZ summary text will appear here after analysis is complete.',
  insights: [
    { metric: 'BMI',      status: 'N/A', insight: 'XYZ BMI insight will be shown here based on user profile data.' },
    { metric: 'BMR',      status: 'N/A', insight: 'XYZ BMR insight will be shown here based on user profile data.' },
    { metric: 'TDEE',     status: 'N/A', insight: 'XYZ TDEE insight will be shown here based on user profile data.' },
    { metric: 'Body Fat', status: 'N/A', insight: 'XYZ body fat insight will be shown here based on user profile data.' },
  ],
  recommendations: [
    'XYZ Recommendation 1 will appear here.',
    'XYZ Recommendation 2 will appear here.',
    'XYZ Recommendation 3 will appear here.',
  ],
  goalAdvice: 'XYZ goal advice will be generated based on your profile and metrics.',
};

const BMI_COLORS = {
  Underweight: '#60a5fa',
  Normal:      '#4ade80',
  Overweight:  '#facc15',
  Obese:       '#f87171',
};

// ─── Reusable metric card ─────────────────────────────────────────────────────

function MetricCard({ icon, label, value, unit, color, description }) {
  return (
    <View style={[styles.card, { borderColor: color + '44' }]}>
      <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={[styles.cardValue, { color }]}>
          {value} <Text style={styles.cardUnit}>{unit}</Text>
        </Text>
        {description && <Text style={styles.cardDesc}>{description}</Text>}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HealthMetricsScreen() {
  const [analysis,  setAnalysis]  = useState(null);
  const [analysing, setAnalysing] = useState(false);

  const bmiColor = BMI_COLORS[DUMMY_METRICS.category] || '#00C897';

  // dummy analyse — just waits 1.5s then shows hardcoded analysis
  function handleAnalyse() {
    setAnalysing(true);
    setTimeout(() => {
      setAnalysis(DUMMY_ANALYSIS);
      setAnalysing(false);
    }, 1500);
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>📊 Health Metrics</Text>
        <Text style={styles.pageSubtitle}>Calculated from your profile data</Text>

        {/* BMI Banner */}
        <View style={[styles.bmiBanner, { borderColor: bmiColor + '66' }]}>
          <LinearGradient
            colors={[bmiColor + '22', bmiColor + '11']}
            style={styles.bmiBannerGradient}
          >
            <Text style={styles.bmiTitle}>Body Mass Index</Text>
            <Text style={[styles.bmiValue, { color: bmiColor }]}>
              {DUMMY_METRICS.bmi.toFixed(1)}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: bmiColor + '33', borderColor: bmiColor + '66' }]}>
              <Text style={[styles.categoryText, { color: bmiColor }]}>{DUMMY_METRICS.category}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Metric Cards */}
        <MetricCard
          icon="🔥" label="Basal Metabolic Rate (BMR)"
          value={DUMMY_METRICS.bmr} unit="kcal/day" color="#f97316"
          description="Calories your body burns at complete rest"
        />
        <MetricCard
          icon="⚡" label="Total Daily Energy Expenditure (TDEE)"
          value={DUMMY_METRICS.tdee} unit="kcal/day" color="#00C897"
          description="Calories you burn per day with your activity level"
        />
        <MetricCard
          icon="💧" label="Body Fat Percentage (BFP)"
          value={DUMMY_METRICS.bfp.toFixed(1)} unit="%" color="#06b6d4"
          description="Estimated using the Deurenberg formula"
        />

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoText}>
            ℹ️ Values are estimates based on the Mifflin-St Jeor equation. Update your profile to recalculate.
          </Text>
        </View>

        {/* AI Analysis Section */}
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>🤖 AI Health Analysis</Text>
            <Text style={styles.analyticsSubtitle}>Powered by OpenAI</Text>
          </View>

          {!analysis && !analysing && (
            <TouchableOpacity style={styles.analyseBtn} onPress={handleAnalyse} activeOpacity={0.85}>
              <LinearGradient colors={['#00C897', '#FF884B']} style={styles.analyseBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.analyseBtnText}>✨ Analyse My Health</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {analysing && (
            <View style={styles.analysingBox}>
              <ActivityIndicator color="#00C897" size="small" />
              <Text style={styles.analysingText}>Zenith is analysing your metrics…</Text>
            </View>
          )}

          {analysis && (
            <View style={{ gap: 14 }}>
              {/* Score */}
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

              {/* Insights */}
              <Text style={styles.analyticsSection}>Metric Insights</Text>
              {analysis.insights.map((ins, i) => {
                const statusColor = ins.status === 'Good' ? '#00C897' : ins.status === 'Warning' ? '#FF884B' : '#ef4444';
                return (
                  <View key={i} style={styles.insightRow}>
                    <Text style={styles.insightIcon}>{ins.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <Text style={styles.insightMetric}>{ins.metric}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>{ins.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.insightText}>{ins.insight}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Recommendations */}
              <Text style={styles.analyticsSection}>Recommendations</Text>
              {analysis.recommendations.map((rec, i) => (
                <View key={i} style={styles.recRow}>
                  <Text style={styles.recBullet}>{i + 1}</Text>
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}

              {/* Goal advice */}
              <View style={styles.goalAdviceCard}>
                <Text style={styles.goalAdviceLabel}>🎯 Goal Advice</Text>
                <Text style={styles.goalAdviceText}>{analysis.goalAdvice}</Text>
              </View>

              <TouchableOpacity onPress={() => setAnalysis(null)} style={styles.reAnalyseBtn}>
                <Text style={styles.reAnalyseBtnText}>🔄 Re-analyse</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Update Profile button */}
        <TouchableOpacity style={styles.updateBtn} activeOpacity={0.85}>
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
  scroll:             { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 14 },
  pageTitle:          { fontSize: 24, fontWeight: '800', color: '#fff' },
  pageSubtitle:       { color: '#666666', fontSize: 13, marginBottom: 4 },
  bmiBanner:          { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  bmiBannerGradient:  { padding: 24, alignItems: 'center', gap: 8 },
  bmiTitle:           { color: '#9E9E9E', fontSize: 14, fontWeight: '600' },
  bmiValue:           { fontSize: 56, fontWeight: '800' },
  categoryBadge:      { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  categoryText:       { fontSize: 14, fontWeight: '700' },
  card:               { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1 },
  cardIcon:           { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardIconText:       { fontSize: 24 },
  cardLabel:          { color: '#9E9E9E', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  cardValue:          { fontSize: 22, fontWeight: '800' },
  cardUnit:           { fontSize: 13, fontWeight: '400', color: '#666666' },
  cardDesc:           { color: '#555555', fontSize: 12, marginTop: 4 },
  infoNote:           { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  infoText:           { color: '#666666', fontSize: 12, lineHeight: 18 },
  updateBtn:          { borderRadius: 14, overflow: 'hidden' },
  updateBtnGradient:  { paddingVertical: 14, alignItems: 'center' },
  updateBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  analyticsCard:      { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2C2C2C', gap: 14 },
  analyticsHeader:    { gap: 2 },
  analyticsTitle:     { color: '#fff', fontSize: 17, fontWeight: '800' },
  analyticsSubtitle:  { color: '#555555', fontSize: 11 },
  analyseBtn:         { borderRadius: 14, overflow: 'hidden' },
  analyseBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  analyseBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  analysingBox:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  analysingText:      { color: '#9E9E9E', fontSize: 13 },
  scoreRow:           { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle:        { width: 72, height: 72, borderRadius: 36, backgroundColor: '#003d2e', borderWidth: 2, borderColor: '#00C897', justifyContent: 'center', alignItems: 'center' },
  scoreNumber:        { color: '#00C897', fontSize: 24, fontWeight: '800' },
  scoreMax:           { color: '#555555', fontSize: 10, textAlign: 'center' },
  scoreLabel:         { color: '#E0E0E0', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scoreSummary:       { color: '#9E9E9E', fontSize: 12, lineHeight: 18 },
  analyticsSection:   { color: '#666666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  insightRow:         { flexDirection: 'row', gap: 12, backgroundColor: '#121212', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  insightIcon:        { fontSize: 22 },
  insightMetric:      { color: '#E0E0E0', fontSize: 13, fontWeight: '700' },
  insightText:        { color: '#9E9E9E', fontSize: 12, lineHeight: 18 },
  statusBadge:        { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  statusText:         { fontSize: 10, fontWeight: '700' },
  recRow:             { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  recBullet:          { width: 22, height: 22, borderRadius: 11, backgroundColor: '#00C89722', color: '#00C897', fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  recText:            { flex: 1, color: '#9E9E9E', fontSize: 13, lineHeight: 20 },
  goalAdviceCard:     { backgroundColor: '#003d2e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#00C897' },
  goalAdviceLabel:    { color: '#00C897', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  goalAdviceText:     { color: '#E0E0E0', fontSize: 13, lineHeight: 20 },
  reAnalyseBtn:       { alignItems: 'center', paddingVertical: 8 },
  reAnalyseBtnText:   { color: '#555555', fontSize: 13, fontWeight: '600' },
});
