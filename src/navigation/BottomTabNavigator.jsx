import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardHomeScreen from '../screens/DashboardHomeScreen';
import DietPlanScreen from '../screens/DietPlanScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import AICoachScreen from '../screens/AICoachScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Diet: 'nutrition',
  Workout: 'barbell',
  'AI Coach': 'chatbubble-ellipses',
  Profile: 'person',
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: '#2C2C2C',
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#00C897',
        tabBarInactiveTintColor: '#666666',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardHomeScreen} />
      <Tab.Screen name="Diet" component={DietPlanScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="AI Coach" component={AICoachScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
