import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, StatusBar, ActivityIndicator, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { generateDietPlan, getNutritionForFood } from '../services/api';
import { saveDietPlan, getDietPlan, getUserProfile } from '../services/firestoreService';
import { checkAndIncrementUsage, getUsageStatus } from '../services/subscriptionService';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', snacks: '🍎', dinner: '🌙' };
const DIET_TYPES = ['Balanced', 'Keto', 'Vegan', 'Vegetarian', 'High-Protein'];

export default function DietPlanScreen({ navigation }) {
  const [plan, setPlan] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dietType, setDietType] = useState('Balanced');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [subscription, setSubscription] = useState({ tier: 'free', diet: { used: 0, limit: 0 } });
  const [editingMeal, setEditingMeal] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [lookingUpNutrition, setLookingUpNutrition] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [targetCal, setTargetCal] = useState(null);
  const [userGoal, setUserGoal] = useState('maintain');
  // sprint 2 ui: collapsible macros per food item
  const [expandedMacros, setExpandedMacros] = useState(new Set());

  const uid = auth.currentUser?.uid;

  function toggleMacros(key) {
    setExpandedMacros(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const loadPlan = useCallback(async () => {
    if (!uid) return;
    setLoading(true);

    // Load subscription FIRST in its own try-catch
    // so a plan error never resets tier back to 'free'
    try {
      const usageStatus = await getUsageStatus(uid);
      setSubscription(usageStatus || { tier: 'free', diet: { used: 0, limit: 0 } });
    } catch (e) {
      console.error('Error loading subscription:', e);
    }

    // Load saved plan separately
    try {
      const saved = await getDietPlan(uid);
      const profile = await getUserProfile(uid);
      if (profile?.goal) setUserGoal(String(profile.goal).toLowerCase());
      // Normalize: getDietPlan may return { plan: {...} } or the raw day map
      const dayMap = saved?.plan || saved;
      if (dayMap && typeof dayMap === 'object' &&
          Object.keys(dayMap).some(k => DAYS.includes(k.toLowerCase()))) {
        const normalized = {};
        Object.keys(dayMap).forEach(k => {
          if (DAYS.includes(k.toLowerCase())) normalized[k.toLowerCase()] = dayMap[k];
        });
        setPlan(normalized);
        setShowForm(false);
      } else {
        setShowForm(true);
      }
    } catch (e) {
      console.error('Error loading diet plan:', e);
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleGenerate = async () => {
    if (!uid) return;
    try {
      setGenerating(true);
      const usageResult = await checkAndIncrementUsage(uid, 'diet');

      if (!usageResult.allowed) {
        if (usageResult.reason === 'locked') {
           Alert.alert('Upgrade Required', 'AI Diet Planning is a Pro feature.');
        } else if (usageResult.reason === 'limit') {
           Alert.alert('Limit Reached', 'Monthly limit reached for diet plan generation.');
        }
        setGenerating(false);
        return;
      }

      const profile = await getUserProfile(uid);

      // Guard: profile must be complete before generating
      if (!profile?.height || !profile?.weight || !profile?.age) {
        Alert.alert(
          'Profile Incomplete',
          'Please complete your profile (height, weight, age) before generating a diet plan.',
          [
            { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setGenerating(false);
        return;
      }

      const metrics = {
        bmi: profile?.bmi, bmr: profile?.bmr,
        tdee: profile?.tdee, bfp: profile?.bfp,
      };
      const prefs = {
        dietType,
        allergies: allergies.trim() || 'none',
        medicalConditions: conditions.trim() || 'none',
      };
      const result = await generateDietPlan(uid, profile, metrics, prefs);
      const dayMap = result?.plan || result;
      if (result?.targetCal) setTargetCal(result.targetCal);
      await saveDietPlan(uid, { plan: dayMap });
      setPlan(dayMap);
      setShowForm(false);

      const updatedUsage = await getUsageStatus(uid);
      if (updatedUsage) setSubscription(updatedUsage);

    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate diet plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getEmptyPlan = () => {
    const p = {};
    DAYS.forEach(day => {
      p[day] = { totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
      MEALS.forEach(meal => { p[day][meal] = []; });
    });
    return p;
  };

  const handlePlanManually = () => {
    setPlan(getEmptyPlan());
    setShowForm(false);
  };

  const startEditMeal = (mealKey) => {
    setEditingMeal(mealKey);
    const dayKey = DAYS[activeDay];
    const items = plan[dayKey]?.[mealKey] || [];
    setEditItems(JSON.parse(JSON.stringify(items))); // deep copy
  };

  const handleDeleteItem = (index) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleLookupAndAdd = async () => {
    if (!newItemName.trim() || !newItemQty.trim()) {
      Alert.alert('Input Required', 'Please enter both food name and quantity.');
      return;
    }
    try {
      setLookingUpNutrition(true);
      const nutritionData = await getNutritionForFood(newItemName.trim(), newItemQty.trim());
      if (!nutritionData) {
        Alert.alert('Error', 'Could not fetch nutrition data for this item.');
        return;
      }
      setEditItems(prev => [...prev, {
        name: newItemName.trim(),
        quantity: newItemQty.trim(),
        calories: nutritionData.calories,
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        fiber: nutritionData.fiber || 0,
      }]);
      setNewItemName('');
      setNewItemQty('');
    } catch (error) {
      console.error('Nutrition lookup error:', error);
      Alert.alert('Lookup Failed', 'Error fetching nutrition details.');
    } finally {
      setLookingUpNutrition(false);
    }
  };

  const recalcTotals = (dayPlan) => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    MEALS.forEach(meal => {
      const items = dayPlan[meal] || [];
      items.forEach(item => {
        totals.calories += item.calories || 0;
        totals.protein += item.protein || 0;
        totals.carbs += item.carbs || 0;
        totals.fat += item.fat || 0;
        totals.fiber += item.fiber || 0;
      });
    });
    return totals;
  };

  // Strip undefined values — Firestore rejects them
  const sanitizeItem = (item) => ({
    name:     item.name     ?? '',
    quantity: item.quantity ?? '',
    calories: item.calories ?? 0,
    protein:  item.protein  ?? 0,
    carbs:    item.carbs    ?? 0,
    fat:      item.fat      ?? 0,
    fiber:    item.fiber    ?? 0,
  });

  const handleSaveEdits = async () => {
    setSavingEdits(true);
    try {
      // Recalculate nutrition for every item via API
      const recalculated = await Promise.all(
        editItems.map(async (item) => {
          if (!item.name?.trim()) return item;
          try {
            const nutrition = await getNutritionForFood(
              item.name.trim(),
              item.quantity?.trim() || '1 serving'
            );
            return sanitizeItem({ ...item, ...nutrition, quantity: item.quantity });
          } catch {
            return sanitizeItem(item); // keep old values if lookup fails
          }
        })
      );

      const dayKey = DAYS[activeDay];
      const updatedPlan = JSON.parse(JSON.stringify(plan || {}));
      if (!updatedPlan[dayKey]) updatedPlan[dayKey] = {};
      updatedPlan[dayKey][editingMeal] = recalculated;
      updatedPlan[dayKey].totals = recalcTotals(updatedPlan[dayKey]);

      setPlan(updatedPlan);
      setEditingMeal(null);
      await saveDietPlan(uid, { plan: updatedPlan });
    } catch (error) {
      console.error('Failed to save edited plan:', error);
      Alert.alert('Save Error', 'Failed to save changes.');
    } finally {
      setSavingEdits(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00C897" />
      </View>
    );
  }

  // Locked State — always show for free tier, even if a plan exists
  if (subscription.tier === 'free') {
    return (
      <View style={styles.lockedContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>AI Diet Planning</Text>
        <Text style={styles.lockedSubtitle}>Upgrade to Pro to unlock AI-generated weekly diet plans</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>Personalized AI macros and meals</Text>
          <Text style={styles.featureItem}>Adjusts to your fitness goals</Text>
          <Text style={styles.featureItem}>Weekly grocery list generation</Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation.navigate('Subscription')}>
          <LinearGradient colors={['#00C897', '#00A87D']} style={styles.upgradeGradient}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.manualButton} onPress={handlePlanManually}>
          <Text style={styles.manualButtonText}>Plan Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Form State
  if (showForm) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <StatusBar barStyle="light-content" />
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Generate Diet Plan</Text>
          <View style={styles.usageBadge}>
            <Text style={styles.usageText}>{subscription.diet?.used} / {subscription.diet?.limit} this month</Text>
          </View>
        </View>

        {targetCal ? (
          <View style={styles.targetCalBanner}>
            <Text style={styles.targetCalText}>Targeting {targetCal} kcal/day</Text>
            <Text style={styles.targetCalSub}>Based on your profile · {userGoal.toUpperCase()}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.chipContainer}>
          {DIET_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, dietType === type && styles.chipActive]}
              onPress={() => setDietType(type)}
            >
              <Text style={[styles.chipText, dietType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Allergies (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Peanuts, Shellfish"
          placeholderTextColor="#666"
          value={allergies}
          onChangeText={setAllergies}
        />

        <Text style={styles.label}>Medical Conditions (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Diabetes, Hypertension"
          placeholderTextColor="#666"
          value={conditions}
          onChangeText={setConditions}
        />

        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
          <LinearGradient colors={['#00C897', '#00A87D']} style={styles.generateBtnGradient}>
            {generating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.generateBtnText}>Generate My Plan</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editManuallyBtn} onPress={handlePlanManually} disabled={generating}>
          <Text style={styles.editManuallyBtnText}>Edit Manually</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Plan View
  const currentDayKey = DAYS[activeDay];
  const currentDayPlan = plan?.[currentDayKey] || getEmptyPlan()[currentDayKey];
  const dayTotals = currentDayPlan.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.planHeader}>
        <Text style={styles.planHeaderTitle}>Diet Plan</Text>
        {subscription.tier !== 'free' && (
          <TouchableOpacity style={styles.regenBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
            <LinearGradient colors={['#00C897', '#FF884B']} style={styles.regenBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.regenBtnText}>Regenerate</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Day selector */}
      <View style={styles.daysScrollerWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroller}>
          {DAY_SHORT.map((day, idx) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, activeDay === idx && styles.dayChipActive]}
              onPress={() => setActiveDay(idx)}
            >
              <Text style={[styles.dayChipText, activeDay === idx && styles.dayChipTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.planScroll} contentContainerStyle={styles.planContent}>
        {MEALS.map(meal => {
          const items = currentDayPlan[meal] || [];
          return (
            <View key={meal} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealIcon}>{MEAL_ICONS[meal]}</Text>
                  <Text style={styles.mealTitle}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                </View>
                <TouchableOpacity onPress={() => startEditMeal(meal)}>
                  <Text style={styles.editIcon}>Edit</Text>
                </TouchableOpacity>
              </View>

              {items.length === 0 ? (
                <Text style={styles.emptyMealText}>No items added yet.</Text>
              ) : (
                items.map((item, idx) => {
                  const macroKey = `${meal}-${idx}`;
                  const isExpanded = expandedMacros.has(macroKey);
                  return (
                    <View key={idx} style={styles.mealItemCard}>
                      <View style={styles.mealItemRow}>
                        <Text style={styles.mealItemName}>{item.name}</Text>
                        <TouchableOpacity style={styles.seeMacrosBtn} onPress={() => toggleMacros(macroKey)}>
                          <Text style={styles.seeMacrosBtnText}>{isExpanded ? 'Hide' : 'See Macros'}</Text>
                        </TouchableOpacity>
                      </View>
                      {item.quantity ? (
                        <Text style={styles.mealItemQty}>{item.quantity}</Text>
                      ) : null}
                      {isExpanded && (
                        <Text style={styles.mealItemMacros}>
                          {Math.round(item.calories)} kcal  |  {Math.round(item.protein)}g protein  |  {Math.round(item.carbs)}g carbs  |  {Math.round(item.fat)}g fat
                          {item.fiber ? `  |  ${Math.round(item.fiber)}g fiber` : ''}
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          );
        })}

        <View style={styles.dayTotalsCard}>
          <Text style={styles.dayTotalsTitle}>Daily Totals</Text>
          <View style={styles.dayTotalsGrid}>
            <View style={styles.dayTotalBox}>
              <Text style={styles.dayTotalValue}>{Math.round(dayTotals.calories)}</Text>
              <Text style={styles.dayTotalLabel}>Calories</Text>
            </View>
            <View style={styles.dayTotalBox}>
              <Text style={styles.dayTotalValue}>{Math.round(dayTotals.protein)}g</Text>
              <Text style={styles.dayTotalLabel}>Protein</Text>
            </View>
            <View style={styles.dayTotalBox}>
              <Text style={styles.dayTotalValue}>{Math.round(dayTotals.carbs)}g</Text>
              <Text style={styles.dayTotalLabel}>Carbs</Text>
            </View>
            <View style={styles.dayTotalBox}>
              <Text style={styles.dayTotalValue}>{Math.round(dayTotals.fat)}g</Text>
              <Text style={styles.dayTotalLabel}>Fat</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editingMeal !== null} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitleIcon}>{editingMeal ? MEAL_ICONS[editingMeal] : ''}</Text>
              <Text style={styles.modalTitle}>{editingMeal ? editingMeal.charAt(0).toUpperCase() + editingMeal.slice(1) : ''}</Text>
            </View>
            <TouchableOpacity onPress={handleSaveEdits} style={styles.saveBtn} disabled={savingEdits}>
              {savingEdits
                ? <ActivityIndicator color="#00C897" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {editItems.map((item, idx) => (
              <View key={idx} style={styles.editItemRow}>
                <View style={styles.editItemInputs}>
                  <TextInput
                    style={styles.editItemNameInput}
                    value={item.name}
                    onChangeText={(val) => {
                      const newItems = [...editItems];
                      newItems[idx].name = val;
                      setEditItems(newItems);
                    }}
                  />
                  <TextInput
                    style={styles.editItemQtyInput}
                    value={item.quantity}
                    placeholder="e.g. 100g"
                    placeholderTextColor="#555"
                    onChangeText={(val) => {
                      const newItems = [...editItems];
                      newItems[idx].quantity = val;
                      setEditItems(newItems);
                    }}
                  />
                </View>
                <View style={styles.editItemStats}>
                  <Text style={styles.editItemStatText}>{Math.round(item.calories)} kcal | {Math.round(item.protein)}P | {Math.round(item.carbs)}C | {Math.round(item.fat)}F</Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(idx)}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.addNewItemSection}>
              <Text style={styles.addNewItemTitle}>Add New Item</Text>
              <View style={styles.addNewItemRow}>
                <TextInput
                  style={styles.newItemNameInput}
                  placeholder="Food name"
                  placeholderTextColor="#666"
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
                <TextInput
                  style={styles.newItemQtyInput}
                  placeholder="e.g. 100g"
                  placeholderTextColor="#666"
                  value={newItemQty}
                  onChangeText={setNewItemQty}
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleLookupAndAdd} disabled={lookingUpNutrition}>
                {lookingUpNutrition ? (
                  <ActivityIndicator color="#00C897" size="small" />
                ) : (
                  <Text style={styles.addBtnText}>+ Add</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingMeal(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer:   { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  container:          { flex: 1, backgroundColor: '#121212' },
  planHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: '#121212' },
  planHeaderTitle:    { color: '#fff', fontSize: 22, fontWeight: '800' },
  regenBtn:           { borderRadius: 10, overflow: 'hidden' },
  regenBtnGradient:   { paddingHorizontal: 14, paddingVertical: 8 },
  regenBtnText:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  scrollContent:      { padding: 16, paddingBottom: 40 },
  lockedContainer:    { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 24 },
  lockIcon:           { fontSize: 64, marginBottom: 16 },
  lockedTitle:        { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  lockedSubtitle:     { fontSize: 16, color: '#9E9E9E', textAlign: 'center', marginBottom: 32 },
  featureList:        { marginBottom: 32 },
  featureItem:        { fontSize: 16, color: '#FFF', marginBottom: 12 },
  upgradeButton:      { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  upgradeGradient:    { paddingVertical: 16, alignItems: 'center' },
  upgradeButtonText:  { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  manualButton:       { paddingVertical: 16, width: '100%', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  manualButtonText:   { color: '#9E9E9E', fontSize: 16, fontWeight: '600' },
  formHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 16 },
  targetCalBanner:    { backgroundColor: '#0d2b22', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#00C89740' },
  targetCalText:      { color: '#00C897', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  targetCalSub:       { color: '#9E9E9E', fontSize: 12 },
  formTitle:          { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  usageBadge:         { backgroundColor: 'rgba(0, 200, 151, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  usageText:          { color: '#00C897', fontSize: 12, fontWeight: 'bold' },
  label:              { fontSize: 16, color: '#FFF', marginBottom: 12, fontWeight: '600' },
  chipContainer:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  chip:               { backgroundColor: '#2C2C2C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  chipActive:         { backgroundColor: '#00C897' },
  chipText:           { color: '#9E9E9E', fontSize: 14 },
  chipTextActive:     { color: '#121212', fontWeight: 'bold' },
  input:              { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#2C2C2C', borderRadius: 12, padding: 16, color: '#FFF', marginBottom: 24, fontSize: 16 },
  generateBtn:        { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  generateBtnGradient:{ paddingVertical: 16, alignItems: 'center' },
  generateBtnText:    { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  editManuallyBtn:    { paddingVertical: 16, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  editManuallyBtnText:{ color: '#FFF', fontSize: 16, fontWeight: '600' },
  daysScrollerWrapper:{ borderBottomWidth: 1, borderBottomColor: '#2C2C2C', backgroundColor: '#1E1E1E' },
  daysScroller:       { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  dayChip:            { backgroundColor: '#2C2C2C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 12 },
  dayChipActive:      { backgroundColor: '#00C897' },
  dayChipText:        { color: '#9E9E9E', fontWeight: '600', fontSize: 14 },
  dayChipTextActive:  { color: '#121212', fontWeight: 'bold' },
  planScroll:         { flex: 1 },
  planContent:        { padding: 16, paddingBottom: 40, gap: 12 },
  mealCard:           { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', gap: 10 },
  mealHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealTitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealIcon:           { fontSize: 18 },
  mealTitle:          { color: '#fff', fontSize: 16, fontWeight: '700' },
  editIcon:           { color: '#9E9E9E', fontSize: 13 },
  emptyMealText:      { color: '#666', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  mealItemCard:       { backgroundColor: '#121212', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  mealItemRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealItemName:       { color: '#E0E0E0', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  mealItemQty:        { color: '#9E9E9E', fontSize: 12, marginTop: 4 },
  mealItemMacros:     { color: '#666', fontSize: 12, marginTop: 6 },
  seeMacrosBtn:       { backgroundColor: '#1E1E1E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#2C2C2C' },
  seeMacrosBtnText:   { color: '#00C897', fontSize: 11, fontWeight: '600' },
  dayTotalsCard:      { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  dayTotalsTitle:     { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  dayTotalsGrid:      { flexDirection: 'row', justifyContent: 'space-between' },
  dayTotalBox:        { alignItems: 'center' },
  dayTotalValue:      { color: '#00C897', fontSize: 20, fontWeight: '800' },
  dayTotalLabel:      { color: '#666', fontSize: 12, marginTop: 4 },
  modalContainer:     { flex: 1, backgroundColor: '#1a1a1a', marginTop: 100, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  modalTitleRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitleIcon:     { fontSize: 20 },
  modalTitle:         { color: '#fff', fontSize: 18, fontWeight: '700' },
  saveBtn:            { backgroundColor: '#00C897', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText:        { color: '#121212', fontWeight: '700', fontSize: 14 },
  modalScroll:        { padding: 20 },
  editItemRow:        { backgroundColor: '#121212', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2C2C2C', gap: 8 },
  editItemInputs:     { flexDirection: 'row', gap: 8 },
  editItemNameInput:  { flex: 2, backgroundColor: '#1E1E1E', color: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  editItemQtyInput:   { flex: 1, backgroundColor: '#1E1E1E', color: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  editItemStats:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editItemStatText:   { color: '#666', fontSize: 12 },
  deleteBtn:          { padding: 4 },
  deleteBtnText:      { fontSize: 16 },
  addNewItemSection:  { backgroundColor: '#121212', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2C2C2C', marginBottom: 12, gap: 10 },
  addNewItemTitle:    { color: '#9E9E9E', fontSize: 13, fontWeight: '700' },
  addNewItemRow:      { flexDirection: 'row', gap: 8 },
  newItemNameInput:   { flex: 2, backgroundColor: '#1E1E1E', color: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  newItemQtyInput:    { flex: 1, backgroundColor: '#1E1E1E', color: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#2C2C2C' },
  addBtn:             { backgroundColor: '#003d2e', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#00C897' },
  addBtnText:         { color: '#00C897', fontWeight: '700' },
  cancelBtn:          { paddingVertical: 16, alignItems: 'center' },
  cancelBtnText:      { color: '#555', fontSize: 14 },
});
