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

// merge so we don't overwrite fields that are already there
export async function saveUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// returns null if the user has no profile yet
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// ─── Weight Log ───────────────────────────────────────────────

export async function saveWeightLog(uid, weight) {
  await addDoc(collection(db, 'users', uid, 'weightLog'), {
    weight,
    date: serverTimestamp(),
  });
}

// last 7 entries only, that's all the chart needs
export async function getWeightLog(uid) {
  const q = query(
    collection(db, 'users', uid, 'weightLog'),
    orderBy('date', 'desc'),
    limit(7)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Diet Plan ────────────────────────────────────────────────

// always the same doc ('latest') so a new plan replaces the old one
export async function saveDietPlan(uid, plan) {
  await setDoc(doc(db, 'users', uid, 'dietPlans', 'latest'), plan, { merge: true });
}

export async function getDietPlan(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'dietPlans', 'latest'));
  return snap.exists() ? snap.data() : null;
}

// ─── AI Chat ──────────────────────────────────────────────────

export async function saveChatMessage(uid, role, message) {
  await addDoc(collection(db, 'users', uid, 'aiChats'), {
    role,
    message,
    timestamp: serverTimestamp(),
  });
}

// older chats were saved as one doc with message + reply, newer ones have a role.
// this turns both into the same shape
export async function getChatHistory(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'aiChats'));
  const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const messages = [];
  raw.forEach((doc) => {
    if (doc.role) {
      messages.push(doc);
    } else if (doc.message && doc.reply) {
      // old style, split into a user message and an assistant message
      const ts = doc.createdAt || '';
      messages.push({ id: doc.id + '_u', role: 'user', message: doc.message, timestamp: ts });
      messages.push({ id: doc.id + '_a', role: 'assistant', message: doc.reply, timestamp: ts });
    }
  });

  // timestamp can be a firestore object or a plain string, so handle both
  messages.sort((a, b) => {
    const tsA = a.timestamp?.seconds || (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() / 1000 : 0);
    const tsB = b.timestamp?.seconds || (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() / 1000 : 0);
    return tsA - tsB;
  });

  return messages;
}

// batch delete is faster than looping over each message
export async function clearChatHistory(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'aiChats'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Fasting Log ──────────────────────────────────────────────

export async function saveFastingSession(uid, session) {
  await addDoc(collection(db, 'users', uid, 'fastingLog'), {
    ...session,
    createdAt: serverTimestamp(),
  });
}

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

// no doc means the user is on the free tier
export async function getSubscription(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'subscription', 'current'));
  return snap.exists() ? snap.data() : { tier: 'free' };
}

export async function saveSubscription(uid, tier) {
  await setDoc(doc(db, 'users', uid, 'subscription', 'current'), {
    tier,
    startDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── Feedback ────────────────────────────────────────────────

// saved twice: once under the user, once in a top-level collection for the admin
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
  await addDoc(collection(db, 'users', uid, 'feedback'), data);
  try {
    await addDoc(collection(db, 'feedback'), data);
  } catch (_) {
    // the top-level write fails until the firestore rules allow it, ignoring for now
  }
}

// ─── Admin Queries ────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function getAllFeedback() {
  const q = query(
    collection(db, 'feedback'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// disabled = true means banned, login checks this flag
export async function setUserBan(uid, banned) {
  await updateDoc(doc(db, 'users', uid), { disabled: banned });
}

// removes every subcollection first, then the user doc. can't be undone
export async function deleteUserData(uid) {
  const batch = writeBatch(db);
  const subcols = ['dietPlans', 'aiChats', 'weightLog', 'fastingLog', 'feedback', 'workoutLog'];
  for (const col of subcols) {
    const snap = await getDocs(collection(db, 'users', uid, col));
    snap.docs.forEach((d) => batch.delete(d.ref));
  }
  batch.delete(doc(db, 'users', uid));
  await batch.commit();
}
