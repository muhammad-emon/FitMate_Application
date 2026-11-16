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

// Maps an exercise (from AI generation or Firestore) to a verified YouTube tutorial video ID
export function resolveYoutubeId(exercise) {
  if (exercise?.youtubeId) return exercise.youtubeId;
  const n = String(exercise?.name || '').toLowerCase();
  const m = String(exercise?.muscleGroup || '').toLowerCase();

  // Direct / keyword match against verified tutorial videos
  if (n.includes('romanian') || n.includes('rdl')) return '7j-2vu0HMvk';
  if (n.includes('deadlift'))                      return 'op9kVnSso6Q';
  if (n.includes('bodyweight squat') || n.includes('air squat')) return 'aclHkVaku9U';
  if (n.includes('squat') || n.includes('leg press')) return 'bEv6CCg2BC8';
  if (n.includes('bench') || n.includes('chest press') || n.includes('fly')) return 'rT7DgCr-3pg';
  if (n.includes('push-up') || n.includes('push up') || n.includes('pushup')) return '_l3ySVKYVJ8';
  if (n.includes('pull-up') || n.includes('pull up') || n.includes('chin-up') || n.includes('pulldown')) return 'eGo4IYlbE5g';
  if (n.includes('barbell row') || n.includes('bent over row') || n.includes('pendlay')) return 'G8l_8chR5BE';
  if (n.includes('row'))                           return 'roCP0KfWRFk';
  if (n.includes('overhead') || n.includes('military')) return '2yjwXTZQDDI';
  if (n.includes('shoulder') || n.includes('lateral'))  return 'qEwKCR5JCog';
  if (n.includes('lunge') || n.includes('split'))  return 'QOVaHwm-Q6U';
  if (n.includes('dip') || n.includes('tricep') || n.includes('pushdown')) return '2z8JmcrW-As';
  if (n.includes('curl') || n.includes('bicep'))   return 'roCP0KfWRFk';
  if (n.includes('plank'))                         return 'pSHjTRCQxIw';
  if (n.includes('crunch') || n.includes('sit-up') || n.includes('leg raise')) return '9FGilxCbdz8';
  if (n.includes('glute') || n.includes('bridge') || n.includes('thrust')) return 'wPM8icPu6H8';
  if (n.includes('burpee'))                        return 'dZgVxmf6jkA';
  if (n.includes('jump rope') || n.includes('skip')) return 'u3zgHI8QnqE';
  if (n.includes('high knee'))                     return 'tx5PGQv3Bgg';
  if (n.includes('mountain'))                      return 'nmwgirgXLYM';
  if (n.includes('jack'))                          return 'iSSAk4XCsRA';

  // Muscle-group fallback so every AI exercise always has a tutorial video
  if (m.includes('leg') || m.includes('quad') || m.includes('glute') || m.includes('hamstring')) return 'bEv6CCg2BC8';
  if (m.includes('chest') || m.includes('pec'))    return 'rT7DgCr-3pg';
  if (m.includes('back') || m.includes('lat'))     return 'roCP0KfWRFk';
  if (m.includes('shoulder') || m.includes('delt')) return 'qEwKCR5JCog';
  if (m.includes('arm') || m.includes('tricep') || m.includes('bicep')) return '2z8JmcrW-As';
  if (m.includes('core') || m.includes('ab'))      return 'pSHjTRCQxIw';
  if (m.includes('cardio'))                        return 'dZgVxmf6jkA';

  return '_l3ySVKYVJ8';
}
