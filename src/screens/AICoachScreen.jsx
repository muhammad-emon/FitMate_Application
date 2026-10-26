import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { askAICoach } from '../services/api';
import { saveChatMessage, getChatHistory, getUserProfile, clearChatHistory } from '../services/firestoreService';
import { checkAndIncrementUsage, getUsageStatus } from '../services/subscriptionService';

// Single chat bubble — renders differently depending on whether it's from the user or Zenith
function ChatBubble({ role, message, timestamp }) {
  const isUser = role === 'user';
  return (
    // Flip the row direction for user messages so they naturally sit on the right side
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {/* Only show Zenith's avatar — users don't need one on the right side */}
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>Z</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleZenith]}>
        {/* User bubbles get a gradient background; Zenith's stay dark */}
        {isUser ? (
          <LinearGradient colors={['#00C897', '#FF884B']} style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        ) : null}
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message}</Text>
        {/* Only show the timestamp if one was actually provided */}
        {timestamp && (
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {typeof timestamp === 'string'
              ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function AICoachScreen({ navigation }) {
  // Grab UID upfront so we don't have to repeat auth.currentUser?.uid everywhere
  const uid = auth.currentUser?.uid;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  // Default to free tier with zeroed-out chat limits until we fetch the real status
  const [subscription, setSubscription] = useState({ tier: 'free', chat: { used: 0, limit: 0 } });
  const flatListRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);

  // On mount: kick off history load, profile fetch, and subscription check in parallel
  useEffect(() => {
    loadHistory();
    getUserProfile(auth.currentUser?.uid).then(setUserProfile).catch(() => {});
    loadSubscription();
  }, []);

  // Fetch the user's current subscription and usage status from Firestore
  async function loadSubscription() {
    try {
      const status = await getUsageStatus(uid);
      setSubscription(status);
    } catch {}
  }

  // Pull chat history from Firestore; show a welcome message if this is a fresh session
  async function loadHistory() {
    try {
      const history = await getChatHistory(uid);
      if (history.length === 0) {
        // Empty history — inject a friendly intro so the screen doesn't feel blank
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          message: "Hi! I'm Zenith, your AI fitness coach. 💪\n\nAsk me anything about:\n• Diet & nutrition\n• Exercise & workouts\n• Your health metrics\n• Weight loss tips",
          timestamp: new Date().toISOString(),
        }]);
      } else {
        setMessages(history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      // Always turn off the spinner, even if the fetch failed
      setLoading(false);
    }
  }

  // Shows a confirmation dialog before wiping the chat — prevents accidental deletes
  async function handleClearChat() {
    Alert.alert(
      '🗑 Clear Chat',
      'This will permanently delete all your chat history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            try {
              await clearChatHistory(uid);
              setMessages([]);
            } catch (e) {
              Alert.alert('Error', 'Could not clear chat. Try again.');
            }
          },
        },
      ]
    );
  }

  // Main send handler — checks limits, optimistically adds the user message, then awaits the AI reply
  async function handleSend() {
    const text = input.trim();
    // Bail early if there's nothing to send or a request is already in flight
    if (!text || sending) return;

    // Check subscription usage
    const check = await checkAndIncrementUsage(uid, 'chat');
    if (!check.allowed) {
      if (check.reason === 'locked') return; // Locked screen handles this
      if (check.reason === 'limit') {
        // Inject a warning bubble inline rather than showing a separate alert
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          message: `⚠️ You've used all ${check.limit} messages for this month. Your limit resets next month. Upgrade to Ultra for 500 messages/month.`,
          timestamp: new Date().toISOString(),
        }]);
        return;
      }
    }

    // Refresh usage display so the badge reflects the message we just consumed
    getUsageStatus(uid).then(setSubscription).catch(() => {});

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      message: text,
      timestamp: new Date().toISOString(),
    };

    // Optimistically append the user message and clear the input immediately — feels snappier
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    // Small delay lets React re-render the new bubble before we try to scroll to it
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Persist user message to Firestore, then hit the AI endpoint with the user's profile context
      await saveChatMessage(uid, 'user', text);
      const res = await askAICoach(text, userProfile);
      // Some API versions return `reply`, others return `message` — handle both just in case
      const reply = res.reply || res.message || 'Sorry, I could not process that.';

      const zenithMsg = {
        // +1 so the ID stays unique even if the user and AI response land in the same millisecond
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: reply,
        timestamp: new Date().toISOString(),
      };

      await saveChatMessage(uid, 'assistant', reply);
      setMessages((prev) => [...prev, zenithMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      // Network error or API failure — show a friendly inline error bubble instead of crashing
      const errMsg = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        message: '⚠️ Could not connect to Zenith. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  // Show a simple centered spinner while the chat history is being fetched
  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  // ── Locked screen for free tier ──────────────────────────────────────────
  // Free users can't use the chat at all — render a paywall instead of the chat UI
  if (subscription.tier === 'free') {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#121212', '#0a1a14', '#121212']} style={StyleSheet.absoluteFill} />
        <StatusBar barStyle="light-content" />
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconWrap}>
            <LinearGradient colors={['#1E1E1E', '#2C2C2C']} style={styles.lockIconBg}>
              <Text style={styles.lockIconText}>🔒</Text>
            </LinearGradient>
          </View>
          <Text style={styles.lockedTitle}>AI Coach Zenith</Text>
          <Text style={styles.lockedSubtitle}>
            Upgrade to Pro or Ultra to unlock unlimited conversations with your personal AI fitness coach.
          </Text>
          {/* List the features so the user knows exactly what they're unlocking */}
          <View style={styles.lockedFeatures}>
            {['Personalized fitness advice', 'Nutrition & diet guidance', 'Workout recommendations', 'Goal tracking support'].map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation?.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#00C897', '#00a87d']} style={styles.upgradeBtnInner}>
              <Text style={styles.upgradeBtnText}>🚀 Upgrade to Pro</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.lockedNote}>50 messages/month on Pro • 500/month on Ultra</Text>
        </View>
      </View>
    );
  }

  // Build the usage label string — only relevant for tiers that actually have a cap
  const usageLabel = subscription.chat?.limit > 0
    ? `${subscription.chat.used} / ${subscription.chat.limit} messages`
    : null;
  // True when the user has hit or exceeded their monthly message cap
  const usageWarning = subscription.chat?.limit > 0 &&
    subscription.chat.used >= subscription.chat.limit;

  return (
    // KeyboardAvoidingView keeps the input bar above the soft keyboard on both platforms
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={['#121212', '#181818', '#121212']} style={StyleSheet.absoluteFill} />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>Z</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Zenith</Text>
            <Text style={styles.headerStatus}>🟢 AI Coach • Online</Text>
          </View>
        </View>
        {/* Only render the usage badge if this tier has a message limit */}
        {usageLabel && (
          <View style={[styles.usageBadge, usageWarning && styles.usageBadgeWarn]}>
            <Text style={[styles.usageBadgeText, usageWarning && styles.usageBadgeTextWarn]}>
              {usageLabel}
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => (
          <ChatBubble role={item.role} message={item.message} timestamp={item.timestamp} />
        )}
        // Auto-scroll whenever content changes, e.g. a new message arrives
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Sending indicator — visible while waiting for Zenith's response */}
      {sending && (
        <View style={styles.typingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>Z</Text>
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#00C897" />
            <Text style={styles.typingText}>Zenith is thinking...</Text>
          </View>
        </View>
      )}

      {/* Limit warning banner — sticky bar above the input when the monthly cap is hit */}
      {usageWarning && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            Monthly limit reached · Resets next month
          </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Subscription')}>
            <Text style={styles.limitBannerUpgrade}>Upgrade ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={[styles.input, usageWarning && styles.inputDisabled]}
          // Change placeholder text to signal the limit is hit rather than just silently disabling
          placeholder={usageWarning ? 'Monthly limit reached' : 'Ask Zenith anything...'}
          placeholderTextColor="#555555"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          editable={!usageWarning}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending || usageWarning) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending || usageWarning}
          activeOpacity={0.8}
        >
          {/* The button gradient is active only when there's valid input and no cap warning */}
          <LinearGradient
            colors={input.trim() && !usageWarning ? ['#00C897', '#FF884B'] : ['#2C2C2C', '#2C2C2C']}
            style={styles.sendBtnGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Locked
  lockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  lockIconWrap: { marginBottom: 24 },
  lockIconBg: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  lockIconText: { fontSize: 44 },
  lockedTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  lockedSubtitle: { color: '#9E9E9E', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  lockedFeatures: { width: '100%', marginBottom: 32, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { color: '#00C897', fontSize: 16, fontWeight: '700' },
  featureText: { color: '#E0E0E0', fontSize: 15 },
  upgradeBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  upgradeBtnInner: { paddingVertical: 16, alignItems: 'center' },
  upgradeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  lockedNote: { color: '#555', fontSize: 13, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1E1E1E',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#003d2e', justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: '#33d4ab', fontWeight: '800', fontSize: 18 },
  headerName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerStatus: { color: '#666666', fontSize: 12, marginTop: 2 },
  usageBadge: {
    backgroundColor: '#1E1E1E', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#00C897',
  },
  usageBadgeWarn: { borderColor: '#FF884B', backgroundColor: '#2a1a0e' },
  usageBadgeText: { color: '#00C897', fontSize: 11, fontWeight: '600' },
  usageBadgeTextWarn: { color: '#FF884B' },
  clearBtn: { padding: 6, marginLeft: 8 },
  clearBtnText: { fontSize: 18 },

  // Messages
  messagesList: { padding: 16, gap: 14, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#003d2e', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#33d4ab', fontWeight: '800', fontSize: 13 },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12, paddingHorizontal: 14, gap: 4, overflow: 'hidden' },
  bubbleZenith: { backgroundColor: '#1E1E1E', borderBottomLeftRadius: 4 },
  bubbleUser: { borderBottomRightRadius: 4, backgroundColor: 'transparent' },
  bubbleText: { color: '#E0E0E0', fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTime: { color: '#555555', fontSize: 10 },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1E1E1E', borderRadius: 14, padding: 10 },
  typingText: { color: '#666666', fontSize: 13 },

  // Limit banner
  limitBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#2a1a0e', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#FF884B33',
  },
  limitBannerText: { color: '#FF884B', fontSize: 13 },
  limitBannerUpgrade: { color: '#00C897', fontSize: 13, fontWeight: '700' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1E1E1E',
  },
  input: {
    flex: 1, backgroundColor: '#1E1E1E', color: '#fff', borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12, fontSize: 15,
    borderWidth: 1, borderColor: '#2C2C2C', maxHeight: 100,
  },
  inputDisabled: { opacity: 0.5 },
  sendBtn: { borderRadius: 24, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGradient: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
