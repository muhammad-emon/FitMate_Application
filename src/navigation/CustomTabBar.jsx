import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS_BASE = [
  { name: 'Home',     icon: '🏠', label: 'Home'     },
  { name: 'Profile',  icon: '👤', label: 'Profile'  },
  { name: 'Health',   icon: '📊', label: 'Health'   },
  { name: 'Diet',     icon: '🥗', label: 'Diet'     },
  { name: 'Workout',  icon: '💪', label: 'Workout'  },
  { name: 'AI Coach', icon: '🤖', label: 'AI'       },
  { name: 'Feedback', icon: '💬', label: 'Feedback' },
];

const TAB_ADMIN = { name: 'Admin', icon: '🛡️', label: 'Admin' };

export default function CustomTabBar({ activeTab, onTabPress, isAdmin = false }) {
  const TABS = isAdmin ? [...TABS_BASE, TAB_ADMIN] : TABS_BASE;
  const insets = useSafeAreaInsets();

  // keep the bar above the phone's nav buttons
  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 8);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.indicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    position: 'relative',
  },
  icon: { fontSize: 18 },
  label: { fontSize: 9, color: '#555555', fontWeight: '600' },
  labelActive: { color: '#00C897' },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#00C897',
  },
});
