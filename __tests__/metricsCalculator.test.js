// Unit Tests for Health Metrics Module (Khademul)
// Follows the AAA Pattern: Arrange -> Act -> Assert
import {
  calculateBMI,
  getBMICategory,
  calculateBMR,
  calculateTDEE,
} from '../src/utils/metricsCalculator';

describe('Health Metrics Module - metricsCalculator', () => {
  test('1. calculates BMI accurately from weight (kg) and height (cm)', () => {
    // Arrange
    const weight = 70;
    const height = 175;

    // Act
    const bmi = calculateBMI(weight, height);

    // Assert (70 / 1.75^2 = 22.86)
    expect(bmi).toBeCloseTo(22.86, 2);
  });

  test('2. classifies BMI into correct WHO categories (boundary values)', () => {
    // Arrange & Act & Assert
    expect(getBMICategory(17.5)).toBe('Underweight');
    expect(getBMICategory(22.0)).toBe('Normal');
    expect(getBMICategory(27.0)).toBe('Overweight');
    expect(getBMICategory(31.0)).toBe('Obese');
  });

  test('3. calculates BMR using Mifflin-St Jeor formula for male and female', () => {
    // Arrange (70 kg, 175 cm, 25 years -> base = 1668.75)
    // Act
    const maleBMR   = calculateBMR(70, 175, 25, 'male');
    const femaleBMR = calculateBMR(70, 175, 25, 'female');

    // Assert (male = base + 5 = 1673.75, female = base - 161 = 1507.75)
    expect(maleBMR).toBeCloseTo(1673.75, 2);
    expect(femaleBMR).toBeCloseTo(1507.75, 2);
  });

  test('4. scales BMR by activity multiplier to get TDEE', () => {
    // Arrange
    const bmr = 1600;

    // Act
    const tdee = calculateTDEE(bmr, 'moderate');

    // Assert (1600 * 1.55 = 2480)
    expect(tdee).toBe(2480);
  });
});
