import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logOut } from '../services/authService';

// profile not built yet, logout button is here so we can test login and signup
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the profile page.</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logOut} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#FFFFFF', fontSize: 18, marginBottom: 24 },
  logoutBtn: {
    paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#00C897',
  },
  logoutText: { color: '#00C897', fontSize: 16, fontWeight: '700' },
});
