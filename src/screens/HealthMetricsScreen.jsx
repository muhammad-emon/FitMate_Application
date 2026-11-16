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
  Normal:      '#4ade80',
  Overweight:  '#facc15',
  Obese:       '#f87171',
};

// ─── Reusable card for a single metric value ──────────────────────────────
function MetricCard({ icon, label, value, unit, color, description }) {
  return (
    // Appending '44' to the color gives a semi-transparent border that matches the accent
    <View style={[styles.card, { borderColor: color + '44' }]}>
      {/* Icon background — '22' hex alpha ≈ 13% opacity */}
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

// ─── Three-column row for showing a range (min / ideal / max) ─────────────
function RangeRow({ label, min, ideal, max, unit, color }) {
  return (
    <View style={[styles.rangeCard, { borderColor: color + '44' }]}>
      <Text style={[styles.rangeLabel, { color }]}>{label}</Text>
      <View style={styles.rangeRow}>
        <View style={styles.rangeCol}>
          <Text style={styles.rangeCaption}>Min</Text>
          <Text style={[styles.rangeVal, { color: color + 'aa' }]}>{min}</Text>
          <Text style={styles.rangeUnit}>{unit}</Text>
        </View>
        <View style={[styles.rangeCol, styles.rangeColIdeal]}>
          <Text style={styles.rangeCaption}>Ideal</Text>
          <Text style={[styles.rangeValIdeal, { color }]}>{ideal}</Text>
          <Text style={styles.rangeUnit}>{unit}</Text>
        </View>
        <View style={styles.rangeCol}>
          <Text style={styles.rangeCaption}>Max</Text>
          <Text style={[styles.rangeVal, { color: color + 'aa' }]}>{max}</Text>
          <Text style={styles.rangeUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Macro bar — shows protein / carbs / fat in a horizontal split bar ────
function MacroBar({ macros, calorieTarget }) {
  if (!macros) return null;
  const total = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  const pPct  = ((macros.protein * 4) / total) * 100;
  const cPct  = ((macros.carbs * 4)   / total) * 100;
  const fPct  = ((macros.fat * 9)     / total) * 100;

  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroTitle}>Daily Macro Split</Text>
      <Text style={styles.macroSub}>{calorieTarget} kcal target</Text>

      {/* Visual bar */}
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarSeg, { flex: pPct, backgroundColor: '#f97316' }]} />
        <View style={[styles.macroBarSeg, { flex: cPct, backgroundColor: '#3b82f6' }]} />
        <View style={[styles.macroBarSeg, { flex: fPct, backgroundColor: '#a855f7' }]} />
      </View>

      {/* Legend */}
      <View style={styles.macroLegend}>
        <View style={styles.macroItem}>
          <View style={[styles.macroDot, { backgroundColor: '#f97316' }]} />
          <View>
            <Text style={styles.macroGrams}>{macros.protein}g</Text>
            <Text style={styles.macroName}>Protein</Text>
          </View>
        </View>
        <View style={styles.macroItem}>
          <View style={[styles.macroDot, { backgroundColor: '#3b82f6' }]} />
          <View>
            <Text style={styles.macroGrams}>{macros.carbs}g</Text>
            <Text style={styles.macroName}>Carbs</Text>
          </View>
        </View>
        <View style={styles.macroItem}>
          <View style={[styles.macroDot, { backgroundColor: '#a855f7' }]} />
          <View>
            <Text style={styles.macroGrams}>{macros.fat}g</Text>
            <Text style={styles.macroName}>Fat</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HealthMetricsScreen({ navigation }) {
  const uid = auth.currentUser?.uid;

  // Core metric values and the BMI category string (e.g. "Normal", "Overweight")
  const [metrics,    setMetrics]    = useState(null);
  const [category,   setCategory]   = useState('');
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [noProfile,  setNoProfile]  = useState(false);
  // AI Analytics state — kept separate so the main metric load stays fast
  const [analysis,   setAnalysis]   = useState(null);
  const [analysing,  setAnalysing]  = useState(false);
  const [analyseErr, setAnalyseErr] = useState('');

  useEffect(() => { calcMetrics(); }, []);

  // Always calculates fresh from profile — also caches to Firestore for api.js / dietPlan
  async function calcMetrics() {
    try {
      const dietDoc = await getDietPlan(uid);

      // ── Load profile ────────────────────────────────────────────────────
      const p = await getUserProfile(uid);
      if (!p?.weight || !p?.height || !p?.age) { setNoProfile(true); return; }
      setProfile(p);

      // ── Run all calculations ────────────────────────────────────────────
      const result = calculateAllMetrics(
        parseFloat(p.weight),
        parseFloat(p.height),
        parseFloat(p.age),
        p.gender        || 'male',
        p.activityLevel || 'moderate',
        p.goal          || 'maintain',
      );

      setMetrics(result);
      setCategory(result.category);

      // ── Persist to Firestore (used by api.js for diet plan prompts) ─────
      await saveDietPlan(uid, {
        ...(dietDoc || {}),
        metrics: {
          bmi:  result.bmi,
          bmr:  result.bmr,
          tdee: result.tdee,
          bfp:  result.bfp,
        },
      });
    } catch (e) {
      console.error('calcMetrics error:', e);
      setNoProfile(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
        <Text style={styles.loadingText}>Calculating your metrics...</Text>
      </View>
    );
  }

  // ── Incomplete profile guard ─────────────────────────────────────────────
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

  const bmiColor = BMI_COLORS[category] || '#00C897';
  const deficit  = metrics.deficit;  // positive = cut, negative = surplus
  const isGain   = deficit < 0;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Health Metrics</Text>
        <Text style={styles.pageSubtitle}>Calculated from your profile data</Text>

        {/* ── BMI Banner ────────────────────────────────────────────────── */}
        <View style={[styles.bmiBanner, { borderColor: bmiColor + '66' }]}>
          <LinearGradient
            colors={[bmiColor + '22', bmiColor + '11']}
            style={styles.bmiBannerGradient}
          >
            <Text style={styles.bmiTitle}>Body Mass Index (BMI)</Text>
            <Text style={[styles.bmiValue, { color: bmiColor }]}>
              {metrics.bmi.toFixed(1)}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: bmiColor + '33', borderColor: bmiColor + '66' }]}>
              <Text style={[styles.categoryText, { color: bmiColor }]}>{category}</Text>
            </View>
            {/* Formula note */}
            <Text style={styles.formulaNote}>weight (kg) ÷ height (m)²</Text>
          </LinearGradient>
        </View>

        {/* ── Section: Energy Metabolism ────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Energy Metabolism</Text>

        <MetricCard
          icon="🔥"
          label="Basal Metabolic Rate (BMR)"
          value={Math.round(metrics.bmr)}
          unit="kcal/day"
          color="#f97316"
          description="Mifflin-St Jeor: calories burned at complete rest"
        />
        <MetricCard
          icon="⚡"
          label="Total Daily Energy Expenditure (TDEE)"
          value={Math.round(metrics.tdee)}
          unit="kcal/day"
          color="#00C897"
          description="BMR × activity multiplier — your true daily burn"
        />

        {/* Calorie target card */}
        <View style={[styles.targetCard, { borderColor: isGain ? '#a855f744' : '#ef444444' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Daily Calorie Target</Text>
            <Text style={[styles.cardValue, { color: isGain ? '#a855f7' : '#ef4444' }]}>
              {metrics.calorieTarget} <Text style={styles.cardUnit}>kcal/day</Text>
            </Text>
            <Text style={styles.cardDesc}>
              {isGain
                ? `+${Math.abs(deficit)} kcal surplus — optimised for muscle gain`
                : deficit === 0
                  ? 'Maintenance calories — no surplus or deficit'
                  : `-${deficit} kcal deficit — optimised for fat loss`}
            </Text>
          </View>
          <View style={[styles.cardIcon, { backgroundColor: isGain ? '#a855f722' : '#ef444422' }]}>
            <Text style={styles.cardIconText}>{isGain ? '📈' : deficit === 0 ? '⚖️' : '📉'}</Text>
          </View>
        </View>

        {/* ── Section: Body Composition ─────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Body Composition</Text>

        <MetricCard
          icon="💧"
          label="Body Fat Percentage (BFP)"
          value={metrics.bfp.toFixed(1)}
          unit="%"
          color="#06b6d4"
          description="Deurenberg: (1.2 × BMI) + (0.23 × age) − (10.8 × sex) − 5.4"
        />

        {/* Ideal weight range */}
        <RangeRow
          label="Ideal Body Weight (Devine)"
          min={metrics.idealWeight.min}
          ideal={metrics.idealWeight.ideal}
          max={metrics.idealWeight.max}
          unit="kg"
          color="#f59e0b"
        />

        {/* ── Section: Daily Targets ────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Daily Targets</Text>

        <MetricCard
          icon="🚰"
          label="Daily Water Intake"
          value={metrics.waterLiters}
          unit="L / day"
          color="#38bdf8"
          description="35 ml/kg × activity boost — stays hydrated at your burn rate"
        />

        {/* Macro split bar */}
        <MacroBar macros={metrics.macros} calorieTarget={metrics.calorieTarget} />

        {/* ── Formula reference card ────────────────────────────────────── */}
        <View style={styles.infoNote}>
          <Text style={styles.infoTitle}>Formulas Used</Text>
          <Text style={styles.infoText}>
            BMI — Quetelet (1832){'\n'}
            BMR — Mifflin-St Jeor (1990){'\n'}
            TDEE — Harris-Benedict activity scale{'\n'}
            BFP — Deurenberg (1991){'\n'}
            Ideal Weight — Devine (1974){'\n'}
            Water — 35 ml/kg with activity adjustment{'\n'}
            Macros — 30% protein · 40% carbs · 30% fat
          </Text>
        </View>

        {/* ── AI Analytics Section ─────────────────────────────────────── */}
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>🤖 AI Health Analysis</Text>
            <Text style={styles.analyticsSubtitle}>Powered by OpenAI</Text>
          </View>

          {!analysis && !analysing && (
            <TouchableOpacity
              style={styles.analyseBtn}
              onPress={async () => {
                setAnalysing(true);
                setAnalyseErr('');
                try {
                  const result = await analyzeHealthMetrics(profile, metrics, category);
                  setAnalysis(result);
                } catch {
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

          {analysing && (
            <View style={styles.analysingBox}>
              <ActivityIndicator color="#00C897" size="small" />
              <Text style={styles.analysingText}>Zenith is analysing your metrics…</Text>
            </View>
          )}

          {analyseErr !== '' && (
            <Text style={styles.analyseErr}>{analyseErr}</Text>
          )}

          {analysis && (
            <View style={{ gap: 14 }}>
              {/* Health Score */}
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

              {/* Per-metric insights */}
              <Text style={styles.analyticsSection}>Metric Insights</Text>
              {analysis.insights?.map((ins, i) => {
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
              {analysis.recommendations?.map((rec, i) => (
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

        {/* Bottom CTA */}
        <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.navigate('Profile')}>
          <LinearGradient colors={['#00C897', '#FF884B']} style={styles.updateBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.updateBtnText}>Update Profile to Recalculate</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingText:     { color: '#666666', fontSize: 13, marginTop: 8 },
  scroll:          { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 14 },
  pageTitle:       { fontSize: 24, fontWeight: '800', color: '#fff' },
  pageSubtitle:    { color: '#666666', fontSize: 13 },

  sectionHeader:   { color: '#9E9E9E', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },

  // BMI banner
  bmiBanner:          { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  bmiBannerGradient:  { padding: 24, alignItems: 'center', gap: 8 },
  bmiTitle:           { color: '#9E9E9E', fontSize: 14, fontWeight: '600' },
  bmiValue:           { fontSize: 56, fontWeight: '800' },
  categoryBadge:      { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  categoryText:       { fontSize: 14, fontWeight: '700' },
  formulaNote:        { color: '#555555', fontSize: 11, marginTop: 4 },

  // Metric card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1,
  },
  cardIcon:  { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { fontSize: 24 },
  cardLabel: { color: '#9E9E9E', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '800' },
  cardUnit:  { fontSize: 13, fontWeight: '400', color: '#666666' },
  cardDesc:  { color: '#555555', fontSize: 12, marginTop: 4 },

  // Calorie target card (reversed layout — icon on right)
  targetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1,
  },

  // Range card (ideal weight)
  rangeCard:      { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  rangeLabel:     { fontSize: 12, fontWeight: '700' },
  rangeRow:       { flexDirection: 'row' },
  rangeCol:       { flex: 1, alignItems: 'center', gap: 2 },
  rangeColIdeal:  { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#2C2C2C' },
  rangeCaption:   { color: '#555555', fontSize: 11, fontWeight: '600' },
  rangeVal:       { fontSize: 18, fontWeight: '700' },
  rangeValIdeal:  { fontSize: 22, fontWeight: '800' },
  rangeUnit:      { color: '#555555', fontSize: 11 },

  // Macro bar
  macroCard:      { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', gap: 12 },
  macroTitle:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  macroSub:       { color: '#555555', fontSize: 12, marginTop: -6 },
  macroBarTrack:  { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: '#121212' },
  macroBarSeg:    { height: 10 },
  macroLegend:    { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroDot:       { width: 10, height: 10, borderRadius: 5 },
  macroGrams:     { color: '#E0E0E0', fontSize: 15, fontWeight: '800' },
  macroName:      { color: '#555555', fontSize: 11 },

  // Info / formula note
  infoNote:       { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C', gap: 6 },
  infoTitle:      { color: '#9E9E9E', fontSize: 12, fontWeight: '700' },
  infoText:       { color: '#555555', fontSize: 12, lineHeight: 20 },

  // No-profile state
  noProfileIcon:  { fontSize: 52 },
  noProfileTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  noProfileMsg:   { color: '#9E9E9E', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Update profile button
  updateBtn:         { borderRadius: 14, overflow: 'hidden' },
  updateBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  updateBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  // AI analytics card
  analyticsCard:     { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#2C2C2C', gap: 14 },
  analyticsHeader:   { gap: 2 },
  analyticsTitle:    { color: '#fff', fontSize: 17, fontWeight: '800' },
  analyticsSubtitle: { color: '#555555', fontSize: 11 },
  analyseBtn:        { borderRadius: 14, overflow: 'hidden' },
  analyseBtnGradient:{ paddingVertical: 14, alignItems: 'center' },
  analyseBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  analysingBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  analysingText:     { color: '#9E9E9E', fontSize: 13 },
  analyseErr:        { color: '#ef4444', fontSize: 13, textAlign: 'center' },

  // Score
  scoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#003d2e', borderWidth: 2, borderColor: '#00C897', justifyContent: 'center', alignItems: 'center' },
  scoreNumber: { color: '#00C897', fontSize: 24, fontWeight: '800' },
  scoreMax:    { color: '#555555', fontSize: 10, textAlign: 'center' },
  scoreLabel:  { color: '#E0E0E0', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scoreSummary:{ color: '#9E9E9E', fontSize: 12, lineHeight: 18 },

  // Insights
  analyticsSection: { color: '#666666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  insightRow:  { flexDirection: 'row', gap: 12, backgroundColor: '#121212', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  insightIcon: { fontSize: 22 },
  insightMetric:{ color: '#E0E0E0', fontSize: 13, fontWeight: '700' },
  insightText: { color: '#9E9E9E', fontSize: 12, lineHeight: 18 },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  statusText:  { fontSize: 10, fontWeight: '700' },

  // Recommendations
  recRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  recBullet:{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#00C89722', color: '#00C897', fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  recText:  { flex: 1, color: '#9E9E9E', fontSize: 13, lineHeight: 20 },

  // Goal advice
  goalAdviceCard:  { backgroundColor: '#003d2e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#00C897' },
  goalAdviceLabel: { color: '#00C897', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  goalAdviceText:  { color: '#E0E0E0', fontSize: 13, lineHeight: 20 },

  reAnalyseBtn:    { alignItems: 'center', paddingVertical: 8 },
  reAnalyseBtnText:{ color: '#555555', fontSize: 13, fontWeight: '600' },
});
