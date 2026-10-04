import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// subscription page not built yet, just a temp screen
export default function SubscriptionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is the subscription page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#FFFFFF', fontSize: 18 },
});
