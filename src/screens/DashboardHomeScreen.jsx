import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { getUserProfile, saveWeightLog, getWeightLog, saveUserProfile } from '../services/firestoreService';
import { calculateBMI, calculateTDEE, calculateBMR } from '../utils/metricsCalculator';

// Returns a greeting string based on the current hour — simple but keeps the UI feeling alive
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Small reusable card for displaying a single metric (BMI, TDEE, weight, etc.)
// The border color uses an alpha suffix ('44') to get a subtle tinted border without a full opacity prop
function StatCard({ icon, label, value, unit, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Renders a simple bar chart from the weight log entries
// Bars are sized relative to the min/max range so even small differences are visible
function WeightBarChart({ data }) {
  // data comes in newest-first from Firestore; flip it so the chart reads left→right chronologically
  const entries = [...data].reverse();
  const weights = entries.map(e => parseFloat(e.weight));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  // Avoid division by zero when all entries have the same weight
  const range = maxW - minW || 1;
  const CHART_H = 72;
  const MIN_BAR = 10; // minimum bar height so even the lowest entry is still visible

  return (
    <View>
      {/* Bars */}
      <View style={styles.chartBars}>
        {entries.map((entry, i) => {
          const w = parseFloat(entry.weight);
          // Scale bar height proportionally within the chart area, offset by MIN_BAR floor
          const barH = ((w - minW) / range) * CHART_H + MIN_BAR;
          const isLatest = i === entries.length - 1;
          // Firestore Timestamps have a toDate() method; fall back to now if somehow missing
          const date = entry.date?.toDate ? entry.date.toDate() : new Date();
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <View key={entry.id || i} style={styles.chartBarCol}>
              {/* Show weight value above the bar; highlight the most recent entry in green */}
              <Text style={[styles.chartBarVal, { color: isLatest ? '#00C897' : '#9E9E9E' }]}>
                {w}
              </Text>
              <View style={styles.chartBarTrack}>
                <View
                  style={[
                    styles.chartBar,
                    { height: barH, backgroundColor: isLatest ? '#00C897' : '#2C2C2C' },
                    isLatest && styles.chartBarLatest,
                  ]}
                />
              </View>
              <Text style={styles.chartBarDate}>{label}</Text>
            </View>
          );
        })}
      </View>
      {/* Trend summary — only makes sense once there are at least 2 entries to compare */}
      {entries.length >= 2 && (() => {
        // Diff between the last and first entry to figure out overall direction
        const diff = (weights[weights.length - 1] - weights[0]).toFixed(1);
        const isDown = diff < 0;
        return (
          <View style={styles.chartTrend}>
            {/* Green for weight loss, orange for gain — feels more motivating this way */}
            <Text style={[styles.chartTrendText, { color: isDown ? '#00C897' : '#FF884B' }]}>
              {isDown ? '\u25bc' : '\u25b2'} {Math.abs(diff)} kg over {entries.length} entries
            </Text>
          </View>
        );
      })()}
    </View>
  );
}

// Main dashboard screen — loads the user's profile + weight history, shows key metrics,
// lets them log a new weight entry, and offers quick nav to other sections of the app
export default function DashboardHomeScreen({ navigation }) {
  const uid = auth.currentUser?.uid;
  const [profile, setProfile] = useState(null);
  const [weightLog, setWeightLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState('');
  // Separate loading flag for the log action so we don't freeze the whole screen
  const [logging, setLogging] = useState(false);
  const [metrics, setMetrics] = useState({ bmi: null, tdee: null });

  // Kick off data load as soon as the screen mounts
  useEffect(() => {
    loadData();
  }, []);

  // Fetches profile and weight log in parallel to keep things snappy,
  // then derives BMI and TDEE from the profile data
  async function loadData() {
    try {
      const [p, log] = await Promise.all([getUserProfile(uid), getWeightLog(uid)]);
      setProfile(p);
      setWeightLog(log);
      // Only calculate metrics if we have all the required fields — partial data would give garbage results
      if (p?.weight && p?.height && p?.age) {
        const bmi = calculateBMI(parseFloat(p.weight), parseFloat(p.height));
        const bmr = calculateBMR(parseFloat(p.weight), parseFloat(p.height), parseFloat(p.age), p.gender || 'male');
        const tdee = calculateTDEE(bmr, p.activityLevel || 'moderate');
        setMetrics({ bmi: bmi.toFixed(1), tdee: Math.round(tdee) });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Handles the weight logging flow — validates input, saves to both the log subcollection
  // and the profile doc, then refreshes the local state so the UI updates immediately
  async function handleLogWeight() {
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      Alert.alert('Invalid', 'Please enter a valid weight.');
      return;
    }
    // Round to 1 decimal place before saving — keeps the data clean
    const kg = parseFloat(parseFloat(newWeight).toFixed(1));
    setLogging(true);
    try {
      // Save to weight log subcollection
      await saveWeightLog(uid, kg);
      // ✅ Sync weight to the profile doc so Profile screen stays up-to-date
      await saveUserProfile(uid, { weight: kg });
      setNewWeight('');
      const log = await getWeightLog(uid);
      setWeightLog(log);
      // Update local profile state so stat card refreshes immediately
      setProfile(prev => prev ? { ...prev, weight: kg } : prev);
      Alert.alert('✅ Logged', `Weight ${kg} kg saved and profile updated.`);
    } catch (e) {
      Alert.alert('Error', 'Could not save weight.');
    } finally {
      setLogging(false);
    }
  }

  // Show a full-screen spinner while we wait for the initial data fetch
  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  // Prefer the most recent log entry over the profile weight — log is always more current
  const currentWeight = weightLog[0]?.weight ?? profile?.weight ?? '—';

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen dark gradient background — gives the app that sleek dark-mode feel */}
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>
            {getGreeting()},{'\n'}
            {/* Only show first name — full name in a greeting looks weird */}
            <Text style={styles.name}>{profile?.name?.split(' ')[0] || 'there'} 👋</Text>
          </Text>
          <Text style={styles.greetingSub}>Here's your fitness overview for today</Text>
        </View>

        {/* Quick stats — BMI, TDEE, and current weight at a glance */}
        <View style={styles.statsRow}>
          <StatCard icon="⚖️" label="BMI" value={metrics.bmi || '—'} unit="" color="#00C897" />
          <StatCard icon="🔥" label="TDEE" value={metrics.tdee || '—'} unit="kcal" color="#f97316" />
          <StatCard icon="📏" label="Weight" value={currentWeight} unit="kg" color="#4ade80" />
        </View>

        {/* Log weight */}
        <View style={styles.logCard}>
          <Text style={styles.logTitle}>📝 Log Today's Weight</Text>
          <View style={styles.logRow}>
            <TextInput
              style={styles.logInput}
              placeholder="e.g. 72.5"
              placeholderTextColor="#555555"
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <TouchableOpacity
              style={styles.logBtn}
              onPress={handleLogWeight}
              disabled={logging}
              activeOpacity={0.85}
            >
              {/* Gradient button adds a nice visual touch without being too flashy */}
              <LinearGradient
                colors={['#00C897', '#FF884B']}
                style={styles.logBtnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {/* Swap button text for a spinner while the save is in flight */}
                {logging
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.logBtnText}>Log</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight history with bar chart */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>📈 Weight Trend</Text>
          {weightLog.length === 0 ? (
            // First-time user nudge — friendly empty state instead of a blank card
            <Text style={styles.noData}>No weight entries yet. Log your first one above!</Text>
          ) : weightLog.length === 1 ? (
            // Only one entry — not enough for a chart, so just show the single row
            <View style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {weightLog[0].date?.toDate
                  ? weightLog[0].date.toDate().toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </Text>
              <Text style={styles.historyWeight}>{weightLog[0].weight} kg</Text>
              <View style={styles.latestBadge}><Text style={styles.latestText}>Latest</Text></View>
            </View>
          ) : (
            // Two or more entries — render the full bar chart
            <WeightBarChart data={weightLog} />
          )}
        </View>

        {/* Quick action cards — these are the main navigation shortcuts on the dashboard */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { icon: '📊', label: 'Health\nMetrics', screen: 'HealthMetrics', color: '#00C897' },
            { icon: '🥗', label: 'Diet\nPlan', screen: 'Diet', color: '#4ade80' },
            { icon: '💪', label: 'Workout', screen: 'Workout', color: '#f97316' },
            { icon: '🤖', label: 'AI\nCoach', screen: 'AI Coach', color: '#06b6d4' },
          ].map(({ icon, label, screen, color }) => (
            <TouchableOpacity
              key={screen}
              style={[styles.quickCard, { borderColor: color + '44' }]}
              onPress={() => navigation.navigate(screen)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 16 },
  greetingSection: { marginBottom: 4 },
  greeting: { fontSize: 22, color: '#9E9E9E', fontWeight: '500' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff' },
  greetingSub: { color: '#555555', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 4, borderWidth: 1,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statUnit: { fontSize: 11, color: '#666666' },
  statLabel: { fontSize: 11, color: '#666666', fontWeight: '600' },
  logCard: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  logTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  logRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  logInput: {
    flex: 1, backgroundColor: '#121212', color: '#fff', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#2C2C2C',
  },
  logBtn: { borderRadius: 10, overflow: 'hidden' },
  logBtnGradient: { paddingHorizontal: 20, paddingVertical: 13, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  historyCard: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', gap: 10 },
  historyTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noData: { color: '#555555', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { color: '#666666', fontSize: 13 },
  historyWeight: { color: '#fff', fontWeight: '700', fontSize: 15 },
  latestBadge: { backgroundColor: '#003d2e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  latestText: { color: '#33d4ab', fontSize: 10, fontWeight: '700' },

  // Bar chart
  chartYRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chartYLabel: { color: '#555555', fontSize: 10 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  chartBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBarVal: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  chartBarTrack: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '80%', borderRadius: 4, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  chartBarLatest: { shadowColor: '#00C897', shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 },
  chartBarDate: { color: '#555555', fontSize: 8, marginTop: 4 },
  chartTrend: { marginTop: 10, alignItems: 'center' },
  chartTrendText: { fontSize: 12, fontWeight: '700' },
  quickActionsTitle: { color: '#9E9E9E', fontSize: 13, fontWeight: '600' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '47%', backgroundColor: '#1E1E1E', borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 8, borderWidth: 1,
  },
  quickIcon: { fontSize: 28 },
  quickLabel: { color: '#9E9E9E', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});Weight: '600', textAlign: 'center' },
});
