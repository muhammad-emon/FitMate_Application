import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getAllUsers, getAllFeedback, setUserBan, deleteUserData } from '../services/firestoreService';

const ADMIN_EMAIL = 'fitmate.admin@gmail.com';
const STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★'];
const STAR_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
const RATING_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UserCard({ user, onPress }) {
  return (
    <TouchableOpacity style={styles.userCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {(user.displayName || user.name || user.email || 'U')[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{user.displayName || user.name || 'No name'}</Text>
        <Text style={styles.userEmail}>{user.email || user.uid}</Text>
        <View style={styles.userTags}>
          {user.goal && <View style={styles.tag}><Text style={styles.tagText}>{user.goal}</Text></View>}
          {user.weight && <View style={styles.tag}><Text style={styles.tagText}>{user.weight} kg</Text></View>}
          {user.bmi && <View style={styles.tag}><Text style={styles.tagText}>BMI {parseFloat(user.bmi).toFixed(1)}</Text></View>}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function FeedbackCard({ fb }) {
  const ts = fb.createdAt?.seconds
    ? new Date(fb.createdAt.seconds * 1000).toLocaleDateString()
    : 'Unknown date';
  return (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <Text style={[styles.feedbackStars, { color: STAR_COLORS[fb.rating] || '#00C897' }]}>
          {STARS[fb.rating] || '?'}
        </Text>
        <Text style={[styles.feedbackRatingLabel, { color: STAR_COLORS[fb.rating] || '#00C897' }]}>
          {RATING_LABELS[fb.rating] || ''}
        </Text>
        <Text style={styles.feedbackDate}>{ts}</Text>
      </View>
      <Text style={styles.feedbackEmail}>{fb.userEmail || fb.uid || 'Anonymous'}</Text>
      <Text style={styles.feedbackMessage}>{fb.message}</Text>
    </View>
  );
}

function UserDetailModal({ user, onClose, onUpdate }) {
  const [working, setWorking] = useState(false);
  if (!user) return null;

  const isBanned = user.disabled === true;

  const fields = [
    ['Age', user.age], ['Gender', user.gender],
    ['Height', user.height ? `${user.height} cm` : null],
    ['Weight', user.weight ? `${user.weight} kg` : null],
    ['Goal', user.goal], ['Activity Level', user.activityLevel],
    ['Country', user.country],
    ['BMI',  user.bmi  ? parseFloat(user.bmi).toFixed(2)         : null],
    ['BMR',  user.bmr  ? Math.round(user.bmr)  + ' kcal'         : null],
    ['TDEE', user.tdee ? Math.round(user.tdee) + ' kcal'         : null],
    ['Status', isBanned ? '🚫 Banned' : '✅ Active'],
  ].filter(([, v]) => v != null);

  async function handleBan() {
    Alert.alert(
      isBanned ? 'Unban User' : 'Ban User',
      isBanned
        ? `Allow ${user.displayName || user.email} to log in again?`
        : `Block ${user.displayName || user.email} from logging in?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBanned ? 'Unban' : 'Ban',
          style: isBanned ? 'default' : 'destructive',
          onPress: async () => {
            setWorking(true);
            try {
              await setUserBan(user.uid, !isBanned);
              onUpdate();
              onClose();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally { setWorking(false); }
          },
        },
      ],
    );
  }

  async function handleDelete() {
    Alert.alert(
      'Delete User Data',
      `Permanently delete ALL data for ${user.displayName || user.email}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            try {
              await deleteUserData(user.uid);
              onUpdate();
              onClose();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally { setWorking(false); }
          },
        },
      ],
    );
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <LinearGradient colors={['#1E1E1E', '#121212']} style={StyleSheet.absoluteFill} />
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{user.displayName || user.name || 'User'}</Text>
              <Text style={styles.modalEmail}>{user.email || user.uid}</Text>
              {isBanned && (
                <View style={styles.bannedBadge}>
                  <Text style={styles.bannedBadgeText}>🚫 BANNED</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Profile fields */}
          <ScrollView style={{ marginTop: 12, maxHeight: 280 }}>
            {fields.map(([k, v]) => (
              <View key={k} style={styles.detailRow}>
                <Text style={styles.detailKey}>{k}</Text>
                <Text style={styles.detailVal}>{v}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Management actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isBanned ? styles.actionUnban : styles.actionBan]}
              onPress={handleBan}
              disabled={working}
            >
              {working
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.actionBtnText}>{isBanned ? '✅ Unban' : '🚫 Ban'}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionDelete]}
              onPress={handleDelete}
              disabled={working}
            >
              <Text style={styles.actionBtnText}>🗑 Delete Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRating, setFilterRating] = useState(0);

  const load = useCallback(async () => {
    try {
      const [u, f] = await Promise.all([getAllUsers(), getAllFeedback()]);
      setUsers(u);
      setFeedback(f);
    } catch (e) {
      console.error('Admin load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };
  const onUserUpdated = () => load();

  const avgRating = feedback.length
    ? (feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : '—';

  const filteredFeedback = filterRating
    ? feedback.filter(f => f.rating === filterRating)
    : feedback;

  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡️ Admin Panel</Text>
          <Text style={styles.headerSub}>FitMate Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: () => signOut(auth) },
            ])
          }
        >
          <Text style={styles.logoutText}>⏻ Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'users',    label: `👥 Users (${users.length})` },
          { id: 'feedback', label: `💬 Feedback (${feedback.length})` },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, activeTab === t.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabBtnText, activeTab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C897" />}
      >
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.statRow}>
              <StatCard icon="👥" label="Total Users"    value={users.length}    color="#00C897" />
              <StatCard icon="💬" label="Feedbacks"      value={feedback.length} color="#FF884B" />
              <StatCard icon="⭐" label="Avg Rating"     value={avgRating}       color="#f59e0b" />
            </View>

            <Text style={styles.sectionTitle}>Rating Breakdown</Text>
            {[5,4,3,2,1].map(r => {
              const count = feedback.filter(f => f.rating === r).length;
              const pct   = feedback.length ? (count / feedback.length) * 100 : 0;
              return (
                <View key={r} style={styles.ratingRow}>
                  <Text style={[styles.ratingStarLabel, { color: STAR_COLORS[r] }]}>{STARS[r]}</Text>
                  <View style={styles.ratingBar}>
                    <View style={[styles.ratingBarFill, { width: `${pct}%`, backgroundColor: STAR_COLORS[r] }]} />
                  </View>
                  <Text style={styles.ratingCount}>{count}</Text>
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            {feedback.slice(0, 3).map(f => <FeedbackCard key={f.id} fb={f} />)}

            <Text style={styles.sectionTitle}>Recent Users</Text>
            {users.slice(0, 5).map(u => (
              <UserCard key={u.uid} user={u} onPress={() => setSelectedUser(u)} />
            ))}
          </>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <>
            <Text style={styles.sectionTitle}>All Registered Users</Text>
            {users.length === 0
              ? <Text style={styles.emptyText}>No users found.</Text>
              : users.map(u => (
          <UserCard key={u.uid} user={u} onPress={() => setSelectedUser(u)} />
                ))
            }
          </>
        )}

        {/* ── FEEDBACK ── */}
        {activeTab === 'feedback' && (
          <>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Filter:</Text>
              {[0,5,4,3,2,1].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.filterBtn, filterRating === r && styles.filterBtnActive]}
                  onPress={() => setFilterRating(r)}
                >
                  <Text style={[styles.filterBtnText, filterRating === r && styles.filterBtnTextActive]}>
                    {r === 0 ? 'All' : `${r}★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filteredFeedback.length === 0
              ? <Text style={styles.emptyText}>No feedback yet. Update Firestore rules to enable admin reads.</Text>
              : filteredFeedback.map(f => <FeedbackCard key={f.id} fb={f} />)
            }
          </>
        )}
      </ScrollView>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={onUserUpdated}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#9E9E9E', fontSize: 14 },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#00C897', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#ef4444',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  logoutText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  tabBtnActive: { backgroundColor: '#00C897' },
  tabBtnText: { color: '#666666', fontSize: 11, fontWeight: '700' },
  tabBtnTextActive: { color: '#fff' },
  scroll: { padding: 16, paddingBottom: 48, gap: 12 },
  sectionTitle: { color: '#9E9E9E', fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  emptyText: { color: '#555555', fontSize: 13, textAlign: 'center', padding: 20, lineHeight: 20 },

  // Stats
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#1E1E1E', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 4, borderWidth: 1,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#666666', fontSize: 11, fontWeight: '600' },

  // Rating breakdown
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ratingStarLabel: { fontSize: 12, width: 60, fontWeight: '700' },
  ratingBar: { flex: 1, height: 8, backgroundColor: '#1E1E1E', borderRadius: 4, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 4 },
  ratingCount: { color: '#666666', fontSize: 12, width: 24, textAlign: 'right' },

  // User card
  userCard: {
    backgroundColor: '#1E1E1E', borderRadius: 14, padding: 14, borderWidth: 1,
    borderColor: '#2C2C2C', flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  userAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#00C897',
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  userName: { color: '#E0E0E0', fontSize: 15, fontWeight: '700' },
  userEmail: { color: '#666666', fontSize: 12, marginTop: 2 },
  userTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { backgroundColor: '#121212', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { color: '#00C897', fontSize: 10, fontWeight: '700' },
  chevron: { color: '#555555', fontSize: 22 },

  // Feedback card
  feedbackCard: {
    backgroundColor: '#1E1E1E', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2C2C2C', gap: 6,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackStars: { fontSize: 16, fontWeight: '800' },
  feedbackRatingLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  feedbackDate: { color: '#555555', fontSize: 11 },
  feedbackEmail: { color: '#00C897', fontSize: 12, fontWeight: '600' },
  feedbackMessage: { color: '#C8C8C8', fontSize: 14, lineHeight: 20 },

  // Filter
  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  filterLabel: { color: '#666666', fontSize: 13, fontWeight: '700' },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#2C2C2C',
  },
  filterBtnActive: { backgroundColor: '#00C897', borderColor: '#00C897' },
  filterBtnText: { color: '#666666', fontSize: 13, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '75%', overflow: 'hidden',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  modalClose: { color: '#666666', fontSize: 22, fontWeight: '700' },
  modalEmail: { color: '#00C897', fontSize: 13, marginTop: 4 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E1E1E',
  },
  detailKey: { color: '#666666', fontSize: 14 },
  detailVal: { color: '#E0E0E0', fontSize: 14, fontWeight: '600' },

  // Banned badge
  bannedBadge: {
    backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef4444',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4,
  },
  bannedBadgeText: { color: '#ef4444', fontSize: 11, fontWeight: '800' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionBan:    { backgroundColor: '#f97316' },
  actionUnban:  { backgroundColor: '#22c55e' },
  actionDelete: { backgroundColor: '#ef4444' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
