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
// Male:   10×weight + 6.25×height − 5×age + 5
// Female: 10×weight + 6.25×height − 5×age − 161

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
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,   // default fallback if nothing matches
  active:      1.725,
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
// (1.20 × BMI) + (0.23 × age) − (10.8 × sexFactor) − 5.4
// Male: sexFactor = 1, Female: sexFactor = 0

// Estimates Body Fat Percentage using the Deurenberg equation
// sexFactor flips between 0 and 1 — males naturally carry less fat at the same BMI, hence the subtraction
export function calculateBFP(bmi, age, gender) {
  const g = String(gender).toLowerCase();
  const sexFactor = g.includes('f') ? 0 : 1; // 0 for female, 1 for male
  return 1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
}

// ─── Ideal Body Weight (Devine formula) ───────────────────────────────────
// Male:   50 + 2.3 × (height_in − 60)
// Female: 45.5 + 2.3 × (height_in − 60)
// Returns the midpoint of a ±10% healthy range as { min, ideal, max }

export function calculateIdealWeight(heightCm, gender) {
  const heightIn = heightCm / 2.54;           // cm → inches for the Devine formula
  const inchesOver5ft = Math.max(0, heightIn - 60); // formula only applies above 5 ft (60 in)
  const g = String(gender).toLowerCase();
  const base = g.includes('f') ? 45.5 : 50;
  const ideal = base + 2.3 * inchesOver5ft;
  return {
    min:   parseFloat((ideal * 0.9).toFixed(1)),   // −10% lower healthy bound
    ideal: parseFloat(ideal.toFixed(1)),
    max:   parseFloat((ideal * 1.1).toFixed(1)),   // +10% upper healthy bound
  };
}

// ─── Daily Water Intake ────────────────────────────────────────────────────
// Rule of thumb: 35 ml per kg of body weight, bumped up based on activity
// Sedentary → ×1.0, light → ×1.1, moderate → ×1.2, active → ×1.3, very_active → ×1.4

export function calculateWaterIntake(weightKg, activityLevel) {
  const activityBoost = {
    sedentary:   1.0,
    light:       1.1,
    moderate:    1.2,
    active:      1.3,
    very_active: 1.4,
  };
  const boost = activityBoost[String(activityLevel).toLowerCase()] || 1.2;
  const liters = (weightKg * 35 * boost) / 1000; // ml → L
  return parseFloat(liters.toFixed(1));
}

// ─── Calorie Targets by Goal ───────────────────────────────────────────────
// Derived from TDEE:
//   Lose weight  → 15% deficit
//   Maintain     → no adjustment
//   Gain muscle  → 10% surplus

export function calculateCalorieTargets(tdee, goal) {
  const g = String(goal).toLowerCase();
  let target;
  if (g.includes('lose') || g.includes('loss') || g.includes('cut')) {
    target = Math.round(tdee * 0.85);
  } else if (g.includes('gain') || g.includes('muscle') || g.includes('bulk')) {
    target = Math.round(tdee * 1.10);
  } else {
    target = Math.round(tdee);
  }
  return { target, deficit: Math.round(tdee - target) };
}

// ─── Macro Split ──────────────────────────────────────────────────────────
// Splits daily calories into protein / carbs / fat in grams
//   Protein : Carbs : Fat  =  30% : 40% : 30%  (balanced default)
//   1 g protein = 4 kcal | 1 g carb = 4 kcal | 1 g fat = 9 kcal

export function calculateMacros(calorieTarget) {
  return {
    protein: Math.round((calorieTarget * 0.30) / 4),
    carbs:   Math.round((calorieTarget * 0.40) / 4),
    fat:     Math.round((calorieTarget * 0.30) / 9),
  };
}

// ─── All metrics in one call ───────────────────────────────────────────────

// Convenience wrapper — runs all calculations and returns them together.
// Updated to include ideal weight, water, calorie target, and macros.
export function calculateAllMetrics(weightKg, heightCm, age, gender, activityLevel, goal = 'maintain') {
  const bmi          = calculateBMI(weightKg, heightCm);
  const bmr          = calculateBMR(weightKg, heightCm, age, gender);
  const tdee         = calculateTDEE(bmr, activityLevel);
  const bfp          = calculateBFP(bmi, age, gender);
  const idealWeight  = calculateIdealWeight(heightCm, gender);
  const waterLiters  = calculateWaterIntake(weightKg, activityLevel);
  const { target: calorieTarget, deficit } = calculateCalorieTargets(tdee, goal);
  const macros       = calculateMacros(calorieTarget);

  return {
    bmi,
    bmr,
    tdee,
    bfp,
    idealWeight,   // { min, ideal, max } in kg
    waterLiters,   // daily water in litres
    calorieTarget, // daily kcal adjusted for goal
    deficit,       // kcal above/below TDEE (negative = surplus)
    macros,        // { protein, carbs, fat } in grams
    category: getBMICategory(bmi),
  };
}
