import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// workout planner not built yet, just a temp screen
export default function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the workout page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#FFFFFF', fontSize: 18 },
});
