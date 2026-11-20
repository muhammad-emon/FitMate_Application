// Unit Tests for Workout Planner Module (Orny)
// Follows the AAA Pattern: Arrange -> Act -> Assert
import { selectRoutine, resolveYoutubeId } from '../src/utils/workoutSelector';
import { WORKOUTS } from '../src/data/workouts';

describe('Workout Planner Module - selectRoutine & resolveYoutubeId', () => {
  test('1. selects Cardio Fat Burn routine for weight loss goal', () => {
    // Arrange
    const profile = { goal: 'lose', activityLevel: 'moderate', weight: 78, height: 170 };

    // Act
    const routine = selectRoutine(profile);

    // Assert
    expect(routine).toBe(WORKOUTS.cardio_burn);
  });

  test('2. selects Muscle Building routine for underweight user (BMI < 18.5)', () => {
    // Arrange (50 kg at 175 cm -> BMI 16.3, boundary case)
    const profile = { goal: 'lose', activityLevel: 'moderate', weight: 50, height: 175 };

    // Act
    const routine = selectRoutine(profile);

    // Assert
    expect(routine).toBe(WORKOUTS.muscle_building);
  });

  test('3. falls back to Full Body routine when profile is null', () => {
    // Arrange
    const profile = null;

    // Act
    const routine = selectRoutine(profile);

    // Assert
    expect(routine).toBe(WORKOUTS.full_body);
  });

  test('4. resolves a valid YouTube video ID for an AI exercise', () => {
    // Arrange
    const exercise = { name: 'Barbell Squat', muscleGroup: 'legs', youtubeId: null };

    // Act
    const videoId = resolveYoutubeId(exercise);

    // Assert
    expect(videoId).toBe('bEv6CCg2BC8');
  });
});
