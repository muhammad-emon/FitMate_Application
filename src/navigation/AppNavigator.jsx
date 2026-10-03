import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import CustomTabBar from './CustomTabBar';

import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import DashboardHomeScreen from '../screens/DashboardHomeScreen';
import DietPlanScreen from '../screens/DietPlanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import AICoachScreen from '../screens/AICoachScreen';
import HealthMetricsScreen from '../screens/HealthMetricsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import AdminScreen from '../screens/AdminScreen';

// this email gets the admin panel instead of the normal app
const ADMIN_EMAIL = 'fitmate.admin@gmail.com';

function AdminStack() {
  return (
    <View style={styles.flex}>
      <AdminScreen />
    </View>
  );
}

// not used right now, keeping it in case we need a quick nav object
function makeNav(setScreen) {
  return {
    navigate: (name) => setScreen(name),
    goBack: () => setScreen(null),
  };
}

// screens before login. no react-navigation here, just a simple state switch
function AuthStack({ onLogin }) {
  const [screen, setScreen] = useState('Landing');

  const nav = {
    navigate: (name) => setScreen(name),
    goBack: () => setScreen('Landing'), // back always goes to landing
  };

  if (screen === 'Landing') return <LandingScreen navigation={nav} />;
  if (screen === 'Login') return <LoginScreen navigation={nav} />;
  if (screen === 'Signup') return <SignupScreen navigation={nav} />;
  if (screen === 'ForgotPassword') return <ForgotPasswordScreen navigation={nav} />;
  return <LandingScreen navigation={nav} />;
}

function MainStack() {
  const [activeTab, setActiveTab] = useState('Home');
  // for pages that cover the whole screen like Subscription
  const [overlayScreen, setOverlayScreen] = useState(null);

  const nav = {
    navigate: (name) => {
      const tabs = ['Home', 'Profile', 'Health', 'Diet', 'Workout', 'AI Coach', 'Feedback'];
      if (tabs.includes(name)) {
        setActiveTab(name);
        setOverlayScreen(null);
        return;
      }
      // not a tab, so open it as an overlay
      setOverlayScreen(name);
    },
    goBack: () => setOverlayScreen(null),
  };

  function renderTab() {
    if (activeTab === 'Home')         return <DashboardHomeScreen navigation={nav} />;
    if (activeTab === 'Profile')      return <ProfileScreen navigation={nav} />;
    if (activeTab === 'Health')       return <HealthMetricsScreen navigation={nav} />;
    if (activeTab === 'Diet')         return <DietPlanScreen navigation={nav} />;
    if (activeTab === 'Workout')      return <WorkoutScreen navigation={nav} />;
    if (activeTab === 'AI Coach')     return <AICoachScreen navigation={nav} />;
    if (activeTab === 'Feedback')     return <FeedbackScreen navigation={nav} />;
    return null;
  }

  function renderOverlay() {
    if (overlayScreen === 'Subscription') return <SubscriptionScreen navigation={nav} />;
    return null;
  }

  return (
    <View style={styles.flex}>
      <View style={styles.screenArea}>
        {overlayScreen ? renderOverlay() : renderTab()}
      </View>
      {/* no tab bar while an overlay is open */}
      {!overlayScreen && (
        <CustomTabBar
          activeTab={activeTab}
          onTabPress={(tab) => { setActiveTab(tab); setOverlayScreen(null); }}
        />
      )}
    </View>
  );
}

export default function AppNavigator() {
  // undefined = firebase hasn't answered yet, null = nobody logged in
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  if (!user) return <AuthStack />;
  if (user.email === ADMIN_EMAIL) return <AdminStack />;
  return <MainStack />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#121212' },
  screenArea: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
});
