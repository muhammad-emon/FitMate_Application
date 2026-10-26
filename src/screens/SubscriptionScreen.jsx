import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { upgradeTier, getSubscription } from '../services/subscriptionService';

const SubscriptionScreen = ({ navigation }) => {
  // tracks which plan the user is currently on (free, pro, ultra)
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // controls the payment modal visibility and what tier/price was selected
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState('');

  // individual card field states — keeping them separate makes formatting easier
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  // success flag to swap out the form for a confirmation screen inside the modal
  const [success, setSuccess] = useState(false);

  // fires a confirmation alert before actually downgrading — good UX to avoid accidental cancels
  async function handleCancelPlan() {
    Alert.alert(
      'Cancel Plan',
      'Are you sure you want to downgrade to the Free plan? You will lose access to AI features immediately.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Plan',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                // downgrade to free tier in the backend, then reflect it locally
                await upgradeTier(user.uid, 'free');
                setCurrentPlan('free');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel plan. Please try again.');
            }
          },
        },
      ]
    );
  }

  // run once on mount to grab the user's current subscription
  useEffect(() => {
    fetchSubscription();
  }, []);

  // pulls subscription data from the service and sets the plan in state
  const fetchSubscription = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const sub = await getSubscription(user.uid);
        // default to 'free' if tier is missing, and lowercase for consistent comparisons
        setCurrentPlan((sub?.tier || 'free').toLowerCase());
      } else {
        setCurrentPlan('free');
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      // if fetch fails, treat user as free rather than crashing
      setCurrentPlan('free');
    } finally {
      setLoading(false);
    }
  };

  // opens the payment modal for the chosen tier and resets anything left over from a previous attempt
  const handleUpgradePress = (tier, price) => {
    setSelectedTier(tier);
    setSelectedPrice(price);
    setPaymentModalVisible(true);
    setSuccess(false);
    resetForm();
  };

  // clears all card input fields — called when re-opening the payment modal
  const resetForm = () => {
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCardName('');
  };

  // strips non-digits then groups into blocks of 4 separated by spaces (e.g. 1234 5678 9012 3456)
  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    // cap at 19 chars to fit a 16-digit card with spaces
    if (formatted.length > 19) formatted = formatted.substring(0, 19);
    setCardNumber(formatted);
  };

  // auto-inserts the slash between month and year as the user types (MM/YY)
  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length >= 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    // never let it exceed MM/YY format (5 chars)
    if (formatted.length > 5) formatted = formatted.substring(0, 5);
    setExpiry(formatted);
  };

  // CVV is just digits, max 3 chars
  const formatCvv = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (formatted.length > 3) formatted = formatted.substring(0, 3);
    setCvv(formatted);
  };

  // handles the actual "pay" action — validates fields, calls the upgrade service, updates plan on success
  const handlePay = async () => {
    // basic front-end validation — all fields must be fully filled before hitting the API
    if (cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3 || cardName.trim() === '') {
      Alert.alert('Invalid Details', 'Please fill all payment fields correctly.');
      return;
    }
    setProcessing(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // in a real app this would talk to a payment processor; here we just flip the tier in Firestore
        await upgradeTier(user.uid, selectedTier.toLowerCase());
        setSuccess(true);
        setCurrentPlan(selectedTier.toLowerCase());
      } else {
        Alert.alert('Error', 'User not authenticated.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment.');
    } finally {
      setProcessing(false);
    }
  };

  // returns the accent color for the badge pill depending on the active plan
  const getBadgeColor = (plan) => {
    switch (plan) {
      case 'Pro':
        return '#00C897';
      case 'Ultra':
        return '#FF884B';
      default:
        // grey for free or anything unexpected
        return '#888888';
    }
  };

  // renders the colored "Current Plan: X" pill shown in the header
  const renderBadge = () => {
    if (!currentPlan) return null;
    return (
      <View style={[styles.badge, { backgroundColor: getBadgeColor(currentPlan) }]}>
        <Text style={styles.badgeText}>Current Plan: {currentPlan}</Text>
      </View>
    );
  };

  // show a spinner while we're fetching the subscription on first load
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* gradient header with back button and current plan badge */}
      <LinearGradient colors={['#1E1E1E', '#121212']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        {renderBadge()}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Free Tier */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Free</Text>
          <Text style={styles.cardPrice}>$0 / month</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• 0 AI diet generations</Text>
            <Text style={styles.featureItem}>• 0 AI chat</Text>
            <Text style={styles.featureItem}>• Manual diet planning ✅</Text>
            <Text style={styles.featureItem}>• All basic features ✅</Text>
          </View>
          {/* if they're on free show "Current Plan", otherwise mention it's included in their paid tier */}
          {currentPlan === 'free' ? (
            <View style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonText}>Current Plan</Text>
            </View>
          ) : (
            <View style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonText}>Included in {currentPlan === 'pro' ? 'Pro' : 'Ultra'}</Text>
            </View>
          )}
        </View>

        {/* Pro Tier */}
        <View style={[styles.card, styles.cardPro]}>
          <Text style={styles.cardTitle}>Pro</Text>
          <Text style={styles.cardPrice}>$4.99 / month</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• 5 AI diet generations/month</Text>
            <Text style={styles.featureItem}>• 50 AI chat messages/month</Text>
            <Text style={styles.featureItem}>• Manual diet editing ✅</Text>
            <Text style={styles.featureItem}>• Priority support ✅</Text>
          </View>
          {/* ultra users already have pro features, so no need to let them "upgrade" to pro */}
          {currentPlan === 'pro' || currentPlan === 'ultra' ? (
            <View style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonText}>
                {currentPlan === 'pro' ? 'Current Plan' : 'Included in Ultra'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.buttonPro}
              onPress={() => handleUpgradePress('Pro', '$4.99')}
            >
              <Text style={styles.buttonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ultra Tier */}
        <View style={[styles.card, styles.cardUltra]}>
          <Text style={styles.cardTitle}>Ultra</Text>
          <Text style={styles.cardPrice}>$9.99 / month</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• 30 AI diet generations/month</Text>
            <Text style={styles.featureItem}>• 500 AI chat messages/month</Text>
            <Text style={styles.featureItem}>• Manual diet editing ✅</Text>
            <Text style={styles.featureItem}>• Priority support ✅</Text>
            <Text style={styles.featureItem}>• Advanced analytics ✅</Text>
          </View>
          {currentPlan === 'ultra' ? (
            <View style={[styles.button, styles.buttonDisabled]}>
              <Text style={styles.buttonText}>Current Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.buttonUltra}
              onPress={() => handleUpgradePress('Ultra', '$9.99')}
            >
              <Text style={styles.buttonText}>Upgrade to Ultra</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* only show the cancel button if the user is on a paid plan */}
        {currentPlan !== 'free' && (
          <TouchableOpacity
            style={styles.cancelPlanBtn}
            onPress={handleCancelPlan}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelPlanText}>Cancel Current Plan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Payment Modal — slides up as a sheet over the plan list */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* swap the form for a success screen once payment goes through */}
            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Text style={styles.successIconText}>✓</Text>
                </View>
                <Text style={styles.successText}>Plan Activated!</Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setPaymentModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Complete Payment</Text>
                <Text style={styles.modalSubtitle}>
                  Upgrade to {selectedTier} ({selectedPrice})
                </Text>

                {/* card number field — formatting handled by formatCardNumber */}
                <TextInput
                  style={styles.input}
                  placeholder="Card Number"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={formatCardNumber}
                  maxLength={19}
                />
                {/* expiry and CVV sit side by side */}
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="MM/YY"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={expiry}
                    onChangeText={formatExpiry}
                    maxLength={5}
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="CVV"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    value={cvv}
                    onChangeText={formatCvv}
                    maxLength={3}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Name on Card"
                  placeholderTextColor="#888"
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                />

                {/* show a spinner inside the button while the request is in-flight */}
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={handlePay}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Pay {selectedPrice}</Text>
                  )}
                </TouchableOpacity>
                {/* also disable cancel while processing so the user can't bail mid-request */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setPaymentModalVisible(false)}
                  disabled={processing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    alignItems: 'center',
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#00C897',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  // pro and ultra cards get a colored border to visually differentiate them
  cardPro: {
    borderColor: '#00C897',
  },
  cardUltra: {
    borderColor: '#FF884B',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardPrice: {
    color: '#888',
    fontSize: 18,
    marginBottom: 15,
  },
  featureList: {
    marginBottom: 20,
  },
  featureItem: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#2C2C2C',
  },
  buttonPro: {
    backgroundColor: '#00C897',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonUltra: {
    backgroundColor: '#FF884B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#00C897',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#121212',
    color: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  payButton: {
    backgroundColor: '#00C897',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00C897',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconText: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  successText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  doneButton: {
    backgroundColor: '#00C897',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  cancelPlanBtn: {
    marginTop: 8,
    marginBottom: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelPlanText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default SubscriptionScreen;
