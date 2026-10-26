// Subscription Service — manages tier, usage limits, and upgrades
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// How many diet plans and chat messages each tier gets per month
// free tier gets nothing — it's locked until they upgrade
export const TIER_LIMITS = {
  free:  { diet: 0,  chat: 0 },
  pro:   { diet: 5,  chat: 50 },
  ultra: { diet: 30, chat: 500 },
};

// Display prices shown in the upgrade UI — not used for payment logic
export const TIER_PRICES = {
  pro:   '$4.99/mo',
  ultra: '$9.99/mo',
};

// Badge/label colors for each tier, used in the UI to visually distinguish them
export const TIER_COLORS = {
  free:  '#9E9E9E',
  pro:   '#00C897',
  ultra: '#FF884B',
};

// Gives us a "YYYY-MM" string so we can reset usage counters every month
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Fetches the user's subscription doc from Firestore
// Falls back to a default free-tier object if the field doesn't exist or the fetch fails
export async function getSubscription(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.data();
    // If no subscription field exists yet, treat them as a brand-new free user
    return data?.subscription || {
      tier: 'free',
      dietUsage: { count: 0, month: '' },
      chatUsage: { count: 0, month: '' },
    };
  } catch {
    // Something went wrong (offline, permissions, etc.) — default to free so the app doesn't crash
    return { tier: 'free', dietUsage: { count: 0, month: '' }, chatUsage: { count: 0, month: '' } };
  }
}

// Upgrades the user to a new tier and wipes their usage counters
// We reset usage on upgrade so they get a clean slate right away
export async function upgradeTier(uid, tier) {
  const resetUsage = {
    'subscription.tier': tier.toLowerCase(),
    'subscription.upgradedAt': new Date().toISOString(),
    // Clear both counters — fair to give them a fresh month after paying
    'subscription.dietUsage': { count: 0, month: '' },
    'subscription.chatUsage': { count: 0, month: '' },
  };
  await updateDoc(doc(db, 'users', uid), resetUsage);
}

// Returns { allowed, reason ('locked'|'limit'|null), count, limit, tier }
// Core gatekeeper — checks if the user can use a feature, then increments if allowed
export async function checkAndIncrementUsage(uid, type) {
  const sub = await getSubscription(uid);
  const tier = (sub?.tier || 'free').toLowerCase();
  const limits = TIER_LIMITS[tier] || TIER_LIMITS['free'];
  const month = currentMonth();

  if (type === 'diet') {
    // limit === 0 means the feature is completely locked on this tier (i.e. free)
    if (limits.diet === 0) return { allowed: false, reason: 'locked', tier };
    const usage = sub.dietUsage || { count: 0, month: '' };
    // If their stored month doesn't match the current month, their count has already reset
    const count = usage.month === month ? usage.count : 0;
    if (count >= limits.diet) return { allowed: false, reason: 'limit', count, limit: limits.diet, tier };
    // They're within limits — write the incremented count back before returning
    await updateDoc(doc(db, 'users', uid), {
      'subscription.dietUsage': { count: count + 1, month },
    });
    return { allowed: true, count: count + 1, limit: limits.diet, tier };
  }

  if (type === 'chat') {
    // Same locked-tier check as diet above
    if (limits.chat === 0) return { allowed: false, reason: 'locked', tier };
    const usage = sub.chatUsage || { count: 0, month: '' };
    // Month mismatch means it's a new billing month — treat count as 0
    const count = usage.month === month ? usage.count : 0;
    if (count >= limits.chat) return { allowed: false, reason: 'limit', count, limit: limits.chat, tier };
    await updateDoc(doc(db, 'users', uid), {
      'subscription.chatUsage': { count: count + 1, month },
    });
    return { allowed: true, count: count + 1, limit: limits.chat, tier };
  }

  // Unknown feature type — just let it through rather than blocking unexpectedly
  return { allowed: true };
}

// Read current usage without incrementing
// Used for displaying the usage bar/stats in the UI — doesn't touch the counters
export async function getUsageStatus(uid) {
  const sub = await getSubscription(uid);
  const tier = (sub?.tier || 'free').toLowerCase();
  const limits = TIER_LIMITS[tier] || TIER_LIMITS['free'];
  const month = currentMonth();

  // If the stored month is stale, the user hasn't used anything yet this month
  const dietCount = sub.dietUsage?.month === month ? (sub.dietUsage?.count || 0) : 0;
  const chatCount = sub.chatUsage?.month === month ? (sub.chatUsage?.count || 0) : 0;

  return {
    tier,
    diet: { used: dietCount, limit: limits.diet },
    chat: { used: chatCount, limit: limits.chat },
  };
}
