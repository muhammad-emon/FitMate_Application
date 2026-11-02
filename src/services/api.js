// API Service — OpenAI integration
// Handles: AI Coach responses, Diet Plan generation, Workout Plan generation

import { calculateAllMetrics } from '../utils/metricsCalculator';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY || '';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_CHAT = 'gpt-3.5-turbo';   // fast, good for chat
const MODEL_JSON = 'gpt-4o-mini';     // reliable structured JSON output

// Shared fetch wrapper for all OpenAI calls — keeps auth headers and request shape in one place
// so each feature function only needs to worry about its own prompts
async function callOpenAI(systemPrompt, userMessage, maxTokens = 1024, model = MODEL_CHAT) {
  // Throw early if the API key isn't set — callers catch this and fall back to demo mode
  if (!OPENAI_KEY) throw new Error('NO_KEY');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt }, // sets the AI's constraints
        { role: 'user',   content: userMessage },  // the actual request from the user
      ],
      temperature: 0.8,  // slightly creative — not too random, not too rigid
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    // Try to pull a readable message from the error response body before throwing
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error: ${res.status}`);
  }
  const json = await res.json();
  // The reply lives deep inside choices[0].message.content — optional chaining handles edge cases
  return json.choices?.[0]?.message?.content?.trim() || '';
}

// ─── Generate Diet Plan ────────────────────────────────────────────────────
// Prompt matches the web app's diet_planner.py exactly
export async function generateDietPlan(uid, profile, metrics, preferences) {
  const country  = profile?.country       || 'Bangladesh';
  const age      = profile?.age           || 25;
  const gender   = profile?.gender        || 'Male';
  const height   = profile?.height        || 170;
  const weight   = profile?.weight        || 70;
  const goal     = profile?.goal          || 'maintain weight';
  const activity = profile?.activityLevel || 'moderate';
  const bmi      = metrics?.bmi  || '';
  const bmr      = metrics?.bmr  || '';
  const tdee     = metrics?.tdee || '';
  const bfp      = metrics?.bfp  || '';
  const dietType = preferences?.dietType          || 'Balanced';
  const allergies= preferences?.allergies         || 'none';
  const disliked = preferences?.dislikedFoods     || 'none';
  const medical  = preferences?.medicalConditions || 'none';

  // Calculate real metrics from profile data (they are NOT stored in Firestore)
  const computed = calculateAllMetrics(
    Number(weight), Number(height), Number(age), gender, activity
  );
  const effectiveBMR  = Number(metrics?.bmr)  || Math.round(computed.bmr);
  const effectiveTDEE = Number(metrics?.tdee) || Math.round(computed.tdee);
  const effectiveBMI  = Number(metrics?.bmi)  || computed.bmi.toFixed(1);
  const effectiveBFP  = Number(metrics?.bfp)  || computed.bfp.toFixed(1);

  // Calorie target from TDEE + goal
  const g = String(goal).toLowerCase();
  let targetCal;
  if (g.includes('lose') || g.includes('loss')) {
    targetCal = Math.round(effectiveTDEE * 0.85); // 15% deficit
  } else if (g.includes('gain') || g.includes('muscle') || g.includes('bulk')) {
    targetCal = Math.round(effectiveTDEE * 1.1);  // 10% surplus
  } else {
    targetCal = Math.round(effectiveTDEE);         // maintain
  }

  console.log(`[Diet] Goal:${goal} TDEE:${effectiveTDEE} Target:${targetCal} kcal/day`);

  const system =
    'You are a culturally aware nutrition expert specializing in Bangladeshi cuisine. ' +
    'IMPORTANT: Bangladesh is a Muslim-majority South Asian country. Its food culture is DISTINCT from Indian Bengali (West Bengal) cuisine. ' +
    'Do NOT use West Bengali Hindu dishes (shukto, luchi, payesh as everyday food, mishti doi as meal, sandesh, rasgulla, etc.). ' +
    'Do NOT use generic Indian dishes (dal makhani, paneer, sabzi, sabji, bhurji, chana masala, rajma, idli, dosa, etc.). ' +
    'Use only everyday Bangladeshi Muslim household food. ' +
    'Always output STRICT JSON — no markdown, explanations, or commentary.';

  const user =
`You are a professional nutritionist. Create a complete weekly diet plan (7 days, Monday to Sunday) for the following user:

Country: ${country}
Age: ${age}
Gender: ${gender}
Height: ${height} cm
Weight: ${weight} kg
Goal: ${goal}
Activity Level: ${activity}
BMI: ${effectiveBMI}, BMR: ${effectiveBMR} kcal, TDEE: ${effectiveTDEE} kcal, Body Fat: ${effectiveBFP}%

Dietary Preferences:
- Type: ${dietType}
- Allergies: ${allergies}
- Disliked Foods: ${disliked}
- Medical Conditions: ${medical}

Guidelines:
- Generate 7 days (Monday to Sunday)
- Each day includes 4 meals: breakfast, lunch, snacks, dinner
- Each meal item includes: name, calories, carbs, protein, fat, fiber, vitamins
- Include total daily nutrients in a 'totals' field
- For the weekly holiday (according to ${country}), include an extra 'specialMeal' with one festive/local dish.

Everyday foods for Bangladesh (MUST use these authentic names when country is Bangladesh):

BREAKFAST staples (pick 1–2 per day, vary across week):
  Ruti with dim vaji | Ruti with dim poch | Paratha with dim omelette | Ruti with aloo bhaji | Ruti with dal |
  Khichuri (light, with egg) | Chira-doi (flattened rice with yoghurt) | Muri with chanachur | Bread with dim poch |
  Panta bhat with begun bhorta and onion (traditional, use sparingly)

LUNCH / DINNER mains (rotate for variety):
  Bhat (steamed rice) | Ruti | Lal ata ruti | Brown rice

DALS (alternate across days):
  Masoor dal | Mug dal (mung dal) | Motor dal (split peas) | Cholar dal | Mushur dal with vegetables

FISH dishes (everyday, affordable):
  Rui mach bhuna | Katla mach curry | Pabda mach jhol | Tilapia mach with vegetables |
  Shrimp with potatoes (chingri-aloo) | Dried fish (shutki) bhorta | Hilsa (only on holiday/special meal)

MEAT (affordable, avoid festive cuts):
  Murgi (chicken) jhol | Chicken with potato curry | Egg curry (dim curry) | Beef (goru mangsho) with potato |
  Liver (kaleji) bhuna | Minced meat (keema) with peas

VEGETABLES / BHORTA (side dishes — always include 1–2 per meal):
  Aloo bhaji | Begun bhaji | Shim bhaji | Lau torkari |
  Kumro torkari | Data shak bhaji | Palang shak bhaji | Korola bhaji |
  Aloo bhorta | Begun bhorta | Tomato bhorta | Kancha morich bhorta | Sarisha bata

SNACKS (afternoon):
  Muri (puffed rice) | Chanachur | Banana | Papaya | Biscuits with tea | Doi (yoghurt) |
  Boiled egg | Roasted chickpeas (boot) | Seasonal fruit | Cha (tea) with toast

FRUITS (year-round in Bangladesh):
  Kola (banana) | Papaya | Guava (peyara) | Watermelon | Mango (only in season) | Lemon

DRINKS:
  Plain water | Lemon water | Cha (tea) with milk | Rong cha (black tea)

Use these names directly. Combine them naturally: e.g. "Bhat with masoor dal and aloo bhaji", "Ruti with murgi jhol and begun bhaji".
For non-Bangladesh users, use equivalent local everyday foods of that country.

STRICTLY FORBIDDEN (never use these — they are NOT Bangladeshi everyday food):
  shukto, luchi, mishti doi (as a meal), sandesh, rasgulla, kheer, dal makhani, paneer, rajma,
  chana masala, sabzi, bhurji, idli, dosa, sambar, upma, poha, sabudana, aloo paratha (Indian style),
  anything labeled "Indian", "Bengali Hindu", or "West Bengal" cuisine.

- Keep total daily calories close to ${targetCal} kcal (+-5%).
- Reply ONLY with valid JSON. No markdown. No explanations.

JSON format:
{
  "monday": {
    "breakfast": [{"name": "Ruti with mixed vegetable curry", "calories": 300, "carbs": 45, "protein": 8, "fat": 8, "fiber": 5, "vitamins": "A, C"}],
    "lunch": [...],
    "snacks": [...],
    "dinner": [...],
    "totals": {"calories": 1550, "protein": 79, "carbs": 205, "fat": 50, "fiber": 17}
  },
  "tuesday": {...},
  "wednesday": {...},
  "thursday": {...},
  "friday": {...},
  "saturday": {...},
  "sunday": {...}
}`;

  // Inner helper for a single API attempt — parses and returns the JSON plan
  // We use regex to pull out the JSON block because GPT sometimes wraps it in explanations
  async function callOnce() {
    const text = await callOpenAI(system, user, 4096, MODEL_JSON);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]);
  }

  // Scale all item macros proportionally so daily total hits targetCal exactly
  function scalePlanToTarget(plan) {
    const DAYS_LIST = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const MEAL_KEYS = ['breakfast','lunch','snacks','dinner'];
    DAYS_LIST.forEach(day => {
      const dayPlan = plan[day];
      if (!dayPlan) return;
      // Sum actual calories across all meals
      let actual = 0;
      MEAL_KEYS.forEach(m => {
        (dayPlan[m] || []).forEach(item => { actual += Number(item.calories) || 0; });
      });
      if (actual <= 0) return;
      const ratio = targetCal / actual;
      // Scale each item proportionally
      MEAL_KEYS.forEach(m => {
        dayPlan[m] = (dayPlan[m] || []).map(item => ({
          ...item,
          calories: Math.round((Number(item.calories) || 0) * ratio),
          protein:  Math.round((Number(item.protein)  || 0) * ratio * 10) / 10,
          carbs:    Math.round((Number(item.carbs)    || 0) * ratio * 10) / 10,
          fat:      Math.round((Number(item.fat)      || 0) * ratio * 10) / 10,
          fiber:    Math.round((Number(item.fiber)    || 0) * ratio * 10) / 10,
        }));
      });
      // Recalc totals
      const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      MEAL_KEYS.forEach(m => {
        (dayPlan[m] || []).forEach(item => {
          t.calories += item.calories || 0;
          t.protein  += item.protein  || 0;
          t.carbs    += item.carbs    || 0;
          t.fat      += item.fat      || 0;
          t.fiber    += item.fiber    || 0;
        });
      });
      dayPlan.totals = {
        calories: Math.round(t.calories),
        protein:  Math.round(t.protein  * 10) / 10,
        carbs:    Math.round(t.carbs    * 10) / 10,
        fat:      Math.round(t.fat      * 10) / 10,
        fiber:    Math.round(t.fiber    * 10) / 10,
      };
    });
    return plan;
  }

  // No API key — serve the demo plan so development works without spending credits
  if (!OPENAI_KEY) return { plan: getDemoPlan(), targetCal };

  try {
    const raw = await callOnce();
    return { plan: scalePlanToTarget(raw), targetCal };
  } catch (firstErr) {
    // First attempt failed — usually a timeout or malformed JSON from the model; retry once
    console.warn('Diet plan first attempt failed, retrying:', firstErr.message);
    try {
      const raw = await callOnce();
      return { plan: scalePlanToTarget(raw), targetCal };
    } catch (e) {
      // Both attempts failed — fall back to the hardcoded demo plan so the user still sees something
      console.error('Diet plan generation error:', e.message);
      return { plan: getDemoPlan(), targetCal };
    }
  }
}

// ─── AI Coach ──────────────────────────────────────────────────────────────
// Sends a message to Zenith (the AI coach) with the user's profile injected as context
export async function askAICoach(userMessage, userProfile = null) {
  // Only build the profile context string if profile data is available
  const profileContext = userProfile
    ? `The user's profile: Age ${userProfile.age}, Gender ${userProfile.gender}, Weight ${userProfile.weight}kg, Height ${userProfile.height}cm, Goal: ${userProfile.goal}.`
    : '';

  const system = `You are Zenith, a friendly and knowledgeable AI fitness coach. You help users with fitness, nutrition, workouts, weight loss, and healthy lifestyle advice. Keep responses concise (2-4 sentences), practical, and encouraging. Plain text only — no markdown or bullet points. ${profileContext}`;

  try {
    const reply = await callOpenAI(system, userMessage, 512);
    return { status: 'ok', reply };
  } catch (e) {
    // NO_KEY means we're in dev/demo mode — use keyword-matched static replies
    if (e.message === 'NO_KEY') return { status: 'ok', reply: getDemoReply(userMessage) };
    console.error('AI Coach error:', e.message);
    // On any other error, still return something useful rather than crashing the chat
    return { status: 'ok', reply: getDemoReply(userMessage) };
  }
}

// ─── Demo fallbacks ────────────────────────────────────────────────────────
// Keyword-based static replies used when there's no API key or an error occurs
// Covers the most common fitness questions so offline mode still feels useful
function getDemoReply(message) {
  const m = message.toLowerCase();
  if (m.includes('weight') || m.includes('lose') || m.includes('gain'))
    return 'For weight management, focus on consistent nutrition and progressive training. Track your calories relative to your TDEE and adjust weekly based on results.';
  if (m.includes('protein') || m.includes('muscle'))
    return 'Aim for 1.6–2.0g of protein per kg of body weight daily. Distribute intake across 3–5 meals for optimal absorption.';
  if (m.includes('workout') || m.includes('exercise'))
    return 'Consistency beats intensity. Start with compound movements 3x per week and progressively overload each session.';
  if (m.includes('sleep') || m.includes('rest'))
    return 'Sleep is when muscle is built and fat is burned. Aim for 7–9 hours. Poor sleep increases cortisol and hunger hormones significantly.';
  return 'Great question! Fitness is a long-term journey. Stay consistent, track your progress weekly, and adjust based on results.';
}

// Hardcoded 7-day Bangladeshi meal plan used when the API is unavailable
// Two templates cycle across the week with modulo so we always get 7 days
function getDemoPlan() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const templates = [
    {
      breakfast: [{ name: 'Ruti with egg bhurji', calories: 350, protein: 18, carbs: 40, fat: 12, fiber: 3, vitamins: 'B1, D' }],
      lunch:     [{ name: 'Bhat with chicken curry and mixed vegetables', calories: 600, protein: 35, carbs: 75, fat: 20, fiber: 5, vitamins: 'A, B12' }],
      snacks:    [{ name: 'Banana with peanuts', calories: 200, protein: 6, carbs: 30, fat: 8, fiber: 3, vitamins: 'C, E' }],
      dinner:    [{ name: 'Dal with sobji and ruti', calories: 400, protein: 20, carbs: 60, fat: 10, fiber: 6, vitamins: 'A, C' }],
      totals:    { calories: 1550, protein: 79, carbs: 205, fat: 50, fiber: 17 },
    },
    {
      breakfast: [{ name: 'Dim bhorta with ruti', calories: 380, protein: 20, carbs: 40, fat: 14, fiber: 2, vitamins: 'B12, D' }],
      lunch:     [{ name: 'Mach bhaja with bhat and dal', calories: 580, protein: 38, carbs: 70, fat: 16, fiber: 4, vitamins: 'A, C' }],
      snacks:    [{ name: 'Papaya slices', calories: 120, protein: 2, carbs: 28, fat: 1, fiber: 3, vitamins: 'A, C' }],
      dinner:    [{ name: 'Chicken curry with ruti', calories: 500, protein: 32, carbs: 45, fat: 18, fiber: 3, vitamins: 'B6, C' }],
      totals:    { calories: 1580, protein: 92, carbs: 183, fat: 49, fiber: 12 },
    },
  ];
  const result = {};
  days.forEach((d, i) => { result[d] = templates[i % templates.length]; });
  return result;
}

// ─── AI Health Analytics ───────────────────────────────────────────────────
// Sends user's health metrics to OpenAI and returns a personalized analysis
export async function analyzeHealthMetrics(profile, metrics, category) {
  const systemPrompt = `You are Zenith, FitMate's AI health analyst. 
Analyze the user's health metrics and provide a clear, motivating, and personalized health report.
Format your response as JSON with exactly this structure:
{
  "overallScore": <number 0-100 representing overall health score>,
  "scoreLabel": "<Excellent|Good|Fair|Needs Attention>",
  "summary": "<2-3 sentence overall health summary tailored to the user>",
  "insights": [
    { "metric": "BMI", "icon": "⚖️", "status": "<Good/Warning/Alert>", "insight": "<personalized 1-2 sentence insight>" },
    { "metric": "BMR", "icon": "🔥", "status": "<Good/Warning/Alert>", "insight": "<personalized 1-2 sentence insight>" },
    { "metric": "TDEE", "icon": "⚡", "status": "<Good/Warning/Alert>", "insight": "<personalized 1-2 sentence insight>" },
    { "metric": "Body Fat", "icon": "💧", "status": "<Good/Warning/Alert>", "insight": "<personalized 1-2 sentence insight>" }
  ],
  "recommendations": [
    "<specific actionable recommendation 1>",
    "<specific actionable recommendation 2>",
    "<specific actionable recommendation 3>"
  ],
  "goalAdvice": "<1-2 sentences of advice specifically aligned with their stated fitness goal>"
}
Be encouraging, specific, and reference their actual numbers. Avoid generic advice.`;

  const userMessage = `Please analyze my health metrics:
- Age: ${profile?.age || 'unknown'} years
- Gender: ${profile?.gender || 'unknown'}
- Goal: ${profile?.goal || 'maintain fitness'}
- BMI: ${metrics.bmi.toFixed(1)} (${category})
- BMR: ${Math.round(metrics.bmr)} kcal/day
- TDEE: ${Math.round(metrics.tdee)} kcal/day
- Body Fat: ${metrics.bfp.toFixed(1)}%
- Activity Level: ${profile?.activityLevel || 'moderate'}`;

  const raw = await callOpenAI(systemPrompt, userMessage, 900, MODEL_JSON);

  // Parse JSON — strip markdown fences if present
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Nutrition Lookup ──────────────────────────────────────────────────────
// Returns nutrition values for a food item — used by the manual diet editor
export async function getNutritionForFood(foodName, quantity) {
  const prompt = `Return ONLY valid JSON for the nutritional information of "${quantity} ${foodName}".
Use this exact format:
{"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number}
All values must be numbers rounded to 1 decimal place. No text, no markdown, just JSON.`;

  try {
    const raw = await callOpenAI('You are a nutrition database. Return only JSON.', prompt, 150, MODEL_JSON);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const data = JSON.parse(match[0]);
    return {
      calories: Number(data.calories) || 0,
      protein:  Number(data.protein)  || 0,
      carbs:    Number(data.carbs)    || 0,
      fat:      Number(data.fat)      || 0,
      fiber:    Number(data.fiber)    || 0,
    };
  } catch {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
}

// ─── Generate AI Workout Plan ───────────────────────────────────────────────
// Builds a personalized workout routine using the user's profile data.
// Returns a routine object matching the same shape as workoutSelector.js so
// WorkoutScreen can use either source interchangeably.
// Returns null on error so the caller can fall back to selectRoutine().
export async function generateWorkoutPlan(profile) {
  const goal     = profile?.goal          || 'Maintain Fitness';
  const gender   = profile?.gender        || 'Male';
  const age      = profile?.age           || 25;
  const weight   = profile?.weight        || 70;
  const height   = profile?.height        || 170;
  const activity = profile?.activityLevel || 'moderate';

  const system =
    'You are an expert certified personal trainer. ' +
    'Create personalized workout plans as strict JSON only — no markdown, no commentary, no extra text.';

  const user =
`Create a weekly workout routine for the following user:
- Goal: ${goal}
- Gender: ${gender}
- Age: ${age}
- Weight: ${weight} kg
- Height: ${height} cm
- Activity Level: ${activity}

Return ONLY valid JSON in exactly this format (no markdown fences):
{
  "goal": "${goal}",
  "name": "<short creative routine name>",
  "description": "<2 sentence description of why this plan suits the user>",
  "daysPerWeek": <number 3-5>,
  "exercises": [
    {
      "name": "<exercise name>",
      "muscleGroup": "<primary muscle group>",
      "sets": <number>,
      "reps": "<rep range e.g. 8-12 or 30s>",
      "rest": "<rest period e.g. 60s>",
      "youtubeId": null
    }
  ]
}

Include 6-9 exercises. Keep the routine realistic and appropriate for the user's activity level. youtubeId must always be null.`;

  try {
    const raw     = await callOpenAI(system, user, 900, MODEL_JSON);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    // Extract the JSON object in case the model adds any prefix text
    const match   = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    return JSON.parse(match[0]);
  } catch (err) {
    // Caller will fall back to selectRoutine() — log so we can debug if needed
    console.warn('[generateWorkoutPlan] Error:', err.message);
    return null;
  }
}

