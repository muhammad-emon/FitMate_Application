import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// health metrics not built yet, just a temp screen
export default function HealthMetricsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the health metrics page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#FFFFFF', fontSize: 18 },
});
