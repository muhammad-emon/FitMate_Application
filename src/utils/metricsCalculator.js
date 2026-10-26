// ─── BMI ──────────────────────────────────────────────────────────────────
// Formula: weight(kg) / height(m)²

// Takes weight in kg and height in cm — converts height to meters first before applying the formula
export function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100; // cm → m, since the formula needs meters squared
  return weightKg / (heightM * heightM);
}

// Buckets a raw BMI value into the standard WHO categories
export function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}

// ─── BMR (Mifflin-St Jeor) ────────────────────────────────────────────────
// Male:   10×weight + 6.25×height - 5×age + 5
// Female: 10×weight + 6.25×height - 5×age - 161

// Calculates Basal Metabolic Rate — calories the body needs just to exist at rest
// Gender detection is string-based so "female", "f", "Female" etc. all work
export function calculateBMR(weightKg, heightCm, age, gender) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age; // shared part of the formula for both sexes
  const g = String(gender).toLowerCase();
  // females get -161, males get +5 — that's just how Mifflin-St Jeor defined it
  return g.includes('f') ? base - 161 : base + 5;
}

// ─── TDEE ─────────────────────────────────────────────────────────────────

// Standard PAL (Physical Activity Level) multipliers — pulled from the Harris-Benedict activity scale
const ACTIVITY_MULTIPLIERS = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,   // default fallback if nothing matches
  active:     1.725,
  very_active: 1.9,
};

// Calculates Total Daily Energy Expenditure by scaling BMR with an activity multiplier
// Accepts either a named level ("moderate") or a raw numeric multiplier — handy for custom sliders
export function calculateTDEE(bmr, activityLevel) {
  const num = parseFloat(activityLevel);
  if (!isNaN(num) && num > 1) {
    // if someone passes in a raw number (e.g. 1.725), just use it directly
    return bmr * num;
  }
  // fall back to the lookup table; default to "moderate" if the key isn't recognized
  const multiplier = ACTIVITY_MULTIPLIERS[String(activityLevel).toLowerCase()] || 1.55;
  return bmr * multiplier;
}

// ─── BFP (Deurenberg formula) ──────────────────────────────────────────────
// (1.20 × BMI) + (0.23 × age) - (10.8 × sexFactor) - 5.4
// Male: sexFactor = 1, Female: sexFactor = 0

// Estimates Body Fat Percentage using the Deurenberg equation
// sexFactor flips between 0 and 1 — males naturally carry less fat at the same BMI, hence the subtraction
export function calculateBFP(bmi, age, gender) {
  const g = String(gender).toLowerCase();
  const sexFactor = g.includes('f') ? 0 : 1; // 0 for female, 1 for male
  return 1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
}

// ─── All metrics in one call ───────────────────────────────────────────────

// Convenience wrapper — runs all four calculations and returns them together
// Useful when you need the full profile at once instead of calling each function separately
export function calculateAllMetrics(weightKg, heightCm, age, gender, activityLevel) {
  const bmi  = calculateBMI(weightKg, heightCm);
  const bmr  = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const bfp  = calculateBFP(bmi, age, gender);
  // bundle everything up, including the BMI label so callers don't have to call getBMICategory separately
  return { bmi, bmr, tdee, bfp, category: getBMICategory(bmi) };
}
