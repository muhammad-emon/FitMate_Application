// Workout routine selection based on user profile
import { WORKOUTS } from '../data/workouts';

// Picks the right workout routine for a user based on their goal, activity level, and BMI.
// Basically the main decision engine for personalizing what workout they get shown.
export function selectRoutine(profile) {
  // If somehow no profile is passed in, just fall back to a safe full-body default
  if (!profile) return WORKOUTS.full_body;

  const { goal, activityLevel, weight, height } = profile;

  // Calculate BMI so we can catch edge cases like underweight users
  // Height comes in as cm, so we convert to meters before squaring
  const bmi = weight && height
    ? parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)
    : 22; // default to a healthy BMI if we're missing the data

  // Underweight users shouldn't be burning calories — push them straight to muscle building
  if (bmi < 18.5) return WORKOUTS.muscle_building;

  // Straightforward — user wants to lose weight, give them cardio
  if (goal === 'lose') return WORKOUTS.cardio_burn;

  // For muscle gain, we differentiate based on activity level
  // Someone who's already active can handle intermediate; a beginner gets an easier starting point
  if (goal === 'gain') {
    const isActive = ['moderate', 'active', 'very_active'].includes(activityLevel);
    return isActive ? WORKOUTS.intermediate_strength : WORKOUTS.beginner_strength;
  }

  // Covers the 'maintain' goal and anything else we didn't explicitly handle
  return WORKOUTS.full_body;
}
