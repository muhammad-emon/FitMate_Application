// Unit Tests for Diet Plan Module (Emon)
// Follows the AAA Pattern: Arrange -> Act -> Assert
import { generateDietPlan } from '../src/services/api';

describe('Diet Plan Module - generateDietPlan', () => {
  test('1. returns a complete 7-day meal plan', async () => {
    // Arrange
    const profile = { age: 24, gender: 'male', height: 170, weight: 70, goal: 'maintain', activityLevel: 'moderate' };

    // Act
    const result = await generateDietPlan('user1', profile, null, {});

    // Assert
    expect(Object.keys(result.plan)).toHaveLength(7);
    expect(result.plan.monday).toHaveProperty('breakfast');
    expect(result.plan.monday).toHaveProperty('lunch');
    expect(result.plan.monday).toHaveProperty('dinner');
  });

  test('2. sets a 15% calorie deficit when goal is weight loss', async () => {
    // Arrange
    const maintainProfile = { age: 24, gender: 'male', height: 170, weight: 70, goal: 'maintain', activityLevel: 'moderate' };
    const loseProfile     = { age: 24, gender: 'male', height: 170, weight: 70, goal: 'lose weight', activityLevel: 'moderate' };

    // Act
    const maintainResult = await generateDietPlan('user1', maintainProfile, null, {});
    const loseResult     = await generateDietPlan('user1', loseProfile, null, {});

    // Assert
    expect(loseResult.targetCal).toBe(Math.round(maintainResult.targetCal * 0.85));
  });

  test('3. sets a 10% calorie surplus when goal is muscle gain', async () => {
    // Arrange
    const maintainProfile = { age: 24, gender: 'male', height: 170, weight: 70, goal: 'maintain', activityLevel: 'moderate' };
    const gainProfile     = { age: 24, gender: 'male', height: 170, weight: 70, goal: 'gain muscle', activityLevel: 'moderate' };

    // Act
    const maintainResult = await generateDietPlan('user1', maintainProfile, null, {});
    const gainResult     = await generateDietPlan('user1', gainProfile, null, {});

    // Assert
    expect(gainResult.targetCal).toBe(Math.round(maintainResult.targetCal * 1.1));
  });
});
