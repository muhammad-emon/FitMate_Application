import { db, auth } from '../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  limit,
  deleteDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

// ─── User Profile ─────────────────────────────────────────────

// Saves (or merges) the user's profile data into Firestore under their UID
export async function saveUserProfile(uid, data) {
  // merge: true so we don't accidentally wipe out existing fields
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// Fetches the user's profile — returns null if the doc doesn't exist yet
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ─── Weight Log ───────────────────────────────────────────────

// Adds a new weight entry to the user's weightLog subcollection with a server timestamp
export async function saveWeightLog(uid, weight) {
  await addDoc(collection(db, 'users', uid, 'weightLog'), {
    weight,
    date: serverTimestamp(),
  });
}

// Grabs the last 7 weight entries sorted newest-first — enough for a weekly chart
export async function getWeightLog(uid) {
  const q = query(
    collection(db, 'users', uid, 'weightLog'),
    orderBy('date', 'desc'),
    limit(7)
  );
  const snap = await getDocs(q);
  // Spread d.data() so we also keep the doc id handy
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Diet Plan ────────────────────────────────────────────────

// Saves the user's current diet plan — always overwrites the 'latest' doc so there's only ever one
export async function saveDietPlan(uid, plan) {
  await setDoc(doc(db, 'users', uid, 'dietPlans', 'latest'), plan, { merge: true });
}

// Fetches the latest diet plan, or null if none has been saved yet
export async function getDietPlan(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'dietPlans', 'latest'));
  return snap.exists() ? snap.data() : null;
}

// ─── AI Chat ──────────────────────────────────────────────────

// Persists a single chat message (user or assistant) with a role field and server timestamp
export async function saveChatMessage(uid, role, message) {
  await addDoc(collection(db, 'users', uid, 'aiChats'), {
    role,
    message,
    timestamp: serverTimestamp(),
  });
}

// Loads full chat history and normalizes it — handles two different doc shapes
// (new format has a 'role' field; old format has separate 'message' + 'reply' fields)
export async function getChatHistory(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'aiChats'));
  const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const messages = [];
  raw.forEach((doc) => {
    if (doc.role) {
      // New format — already has role attached, just push it
      messages.push(doc);
    } else if (doc.message && doc.reply) {
      // Old format — split it into two separate message objects (user + assistant)
      const ts = doc.createdAt || '';
      messages.push({ id: doc.id + '_u', role: 'user', message: doc.message, timestamp: ts });
      messages.push({ id: doc.id + '_a', role: 'assistant', message: doc.reply, timestamp: ts });
    }
  });

  // Sort chronologically — timestamps can be Firestore objects or ISO strings, so handle both
  messages.sort((a, b) => {
    const tsA = a.timestamp?.seconds || (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() / 1000 : 0);
    const tsB = b.timestamp?.seconds || (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() / 1000 : 0);
    return tsA - tsB;
  });

  return messages;
}

// Deletes all chat messages using a batch — way more efficient than deleting one by one
export async function clearChatHistory(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'aiChats'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Fasting Log ──────────────────────────────────────────────

// Saves a completed fasting session — spreads the session object and adds a server timestamp
export async function saveFastingSession(uid, session) {
  await addDoc(collection(db, 'users', uid, 'fastingLog'), {
    ...session,
    createdAt: serverTimestamp(),
  });
}

// Returns the 7 most recent fasting sessions for the history/chart view
export async function getFastingHistory(uid) {
  const q = query(
    collection(db, 'users', uid, 'fastingLog'),
    orderBy('createdAt', 'desc'),
    limit(7)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Subscription ─────────────────────────────────────────────

// Fetches the user's subscription tier — defaults to 'free' if no doc exists yet
export async function getSubscription(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'subscription', 'current'));
  return snap.exists() ? snap.data() : { tier: 'free' };
}

// Saves the user's subscription tier under a fixed 'current' doc (single doc per user)
export async function saveSubscription(uid, tier) {
  await setDoc(doc(db, 'users', uid, 'subscription', 'current'), {
    tier,
    startDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Feedback ────────────────────────────────────────────────

// Saves user feedback both to their personal subcollection AND the global 'feedback' collection
// The global write might fail if Firestore rules aren't configured yet, so we swallow that error
export async function saveFeedback(uid, rating, message) {
  const userEmail = auth.currentUser?.email || '';
  const data = {
    uid,
    userEmail,
    rating,
    message,
    createdAt: serverTimestamp(),
    appVersion: 'V1',
  };
  // Always save to the user's own subcollection — this should never fail
  await addDoc(collection(db, 'users', uid, 'feedback'), data);
  try {
    // Also write to the root 'feedback' collection for the admin dashboard
    await addDoc(collection(db, 'feedback'), data);
  } catch (_) {
    // Root write may fail until Firestore rules are updated — silently ignore
  }
}

// ─── Admin Queries ────────────────────────────────────────────

// Pulls all user documents — used for the admin panel's user management view
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

// Fetches all feedback sorted newest-first so the admin sees the latest submissions first
export async function getAllFeedback() {
  const q = query(
    collection(db, 'feedback'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Toggles the 'disabled' flag on a user doc — used by admins to ban/unban users
export async function setUserBan(uid, banned) {
  await updateDoc(doc(db, 'users', uid), { disabled: banned });
}

// Nukes all of a user's data across every subcollection in a single batch, then removes their doc
// Make sure you really mean it before calling this — it's not reversible
export async function deleteUserData(uid) {
  const batch = writeBatch(db);
  const subcols = ['dietPlans', 'aiChats', 'weightLog', 'fastingLog', 'feedback', 'workoutLog'];
  for (const col of subcols) {
    const snap = await getDocs(collection(db, 'users', uid, col));
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  // Delete the root user doc last, after all subcollections are queued
  batch.delete(doc(db, 'users', uid));
  await batch.commit();
}
