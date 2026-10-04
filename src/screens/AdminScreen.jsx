import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { logOut } from '../services/authService';

// only the layout is done for now, stats, users and feedback come later
export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

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
              { text: 'Logout', style: 'destructive', onPress: logOut },
            ])
          }
        >
          <Ionicons name="power" size={14} color="#ef4444" />
          <Text style={styles.logoutText}> Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'users',    label: '👥 Users' },
          { id: 'feedback', label: '💬 Feedback' },
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

      {/* just text for now */}
      <View style={styles.content}>
        {activeTab === 'overview' && (
          <Text style={styles.text}>This is the admin overview page.</Text>
        )}
        {activeTab === 'users' && (
          <Text style={styles.text}>This is the admin users page.</Text>
        )}
        {activeTab === 'feedback' && (
          <Text style={styles.text}>This is the admin feedback page.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerSub: { color: '#00C897', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#ef4444',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center',
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#FFFFFF', fontSize: 18 },
});
