import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// sprint 2 — full ui dummy (emon)
// all views visible, hardcoded data, no api or firestore calls

const DAYS  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MEALS = ['breakfast','lunch','snacks','dinner'];
const MEAL_ICONS = { breakfast:'🌅', lunch:'☀️', snacks:'🍎', dinner:'🌙' };
const DIET_TYPES = ['Balanced','Keto','Vegan','Vegetarian','High-Protein'];

// ─── Dummy plan data ──────────────────────────────────────────────────────────

const DUMMY_DAY = {
  breakfast: [
    { name:'XYZ Breakfast Item 1',  calories:0, protein:0, carbs:0, fat:0, fiber:0 },
    { name:'XYZ Breakfast Item 2',  calories:0, protein:0, carbs:0, fat:0, fiber:0 },
  ],
  lunch: [
    { name:'XYZ Lunch Item 1',      calories:0, protein:0, carbs:0, fat:0, fiber:0 },
    { name:'XYZ Lunch Item 2',      calories:0, protein:0, carbs:0, fat:0, fiber:0 },
  ],
  snacks: [
    { name:'XYZ Snack Item 1',      calories:0, protein:0, carbs:0, fat:0, fiber:0 },
    { name:'XYZ Snack Item 2',      calories:0, protein:0, carbs:0, fat:0, fiber:0 },
  ],
  dinner: [
    { name:'XYZ Dinner Item 1',     calories:0, protein:0, carbs:0, fat:0, fiber:0 },
    { name:'XYZ Dinner Item 2',     calories:0, protein:0, carbs:0, fat:0, fiber:0 },
  ],
  totals: { calories:0, protein:0, carbs:0, fat:0, fiber:0 },
};

// reuse the same dummy day for all days
const DUMMY_PLAN = {};
DAYS.forEach(d => { DUMMY_PLAN[d] = DUMMY_DAY; });

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DietPlanScreen() {
  const [view,        setView]        = useState('plan');   // 'form' | 'plan' | 'locked'
  const [activeDay,   setActiveDay]   = useState(0);
  const [dietType,    setDietType]    = useState('Balanced');
  const [allergies,   setAllergies]   = useState('');
  const [conditions,  setConditions]  = useState('');
  const [editingMeal, setEditingMeal] = useState(null);
  const [editItems,   setEditItems]   = useState([]);
  const [expandedMacros, setExpandedMacros] = useState(new Set());

  function toggleMacros(key) {
    setExpandedMacros(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const dayKey     = DAYS[activeDay];
  const dayPlan    = DUMMY_PLAN[dayKey];
  const dayTotals  = dayPlan.totals;

  function openEdit(meal) {
    setEditingMeal(meal);
    setEditItems([...dayPlan[meal]]);
  }

  // ── Locked state (free tier) ────────────────────────────────────────────────
  if (view === 'locked') {
    return (
      <View style={styles.lockedContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>AI Diet Planning</Text>
        <Text style={styles.lockedSubtitle}>Upgrade to Pro to unlock AI-generated weekly diet plans</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✨ Personalized AI macros and meals</Text>
          <Text style={styles.featureItem}>✨ Adjusts to your fitness goals</Text>
          <Text style={styles.featureItem}>✨ Weekly grocery list generation</Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.85}>
          <LinearGradient colors={['#00C897','#00A87D']} style={styles.upgradeGradient}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.manualButton} onPress={() => setView('plan')}>
          <Text style={styles.manualButtonText}>Plan Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Generate form ───────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <StatusBar barStyle="light-content" />

        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Generate Diet Plan</Text>
          <View style={styles.usageBadge}>
            <Text style={styles.usageText}>2 / 5 this month</Text>
          </View>
        </View>

        {/* Calorie target preview */}
        <View style={styles.targetCalBanner}>
          <Text style={styles.targetCalText}>🎯 Targeting 1,770 kcal/day</Text>
          <Text style={styles.targetCalSub}>Based on your profile · MAINTAIN</Text>
        </View>

        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.chipContainer}>
          {DIET_TYPES.map(t => (
            <TouchableOpacity key={t}
              style={[styles.chip, dietType === t && styles.chipActive]}
              onPress={() => setDietType(t)}
            >
              <Text style={[styles.chipText, dietType === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Allergies (Optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. Peanuts, Shellfish"
          placeholderTextColor="#666" value={allergies} onChangeText={setAllergies} />

        <Text style={styles.label}>Medical Conditions (Optional)</Text>
        <TextInput style={styles.input} placeholder="e.g. Diabetes, Hypertension"
          placeholderTextColor="#666" value={conditions} onChangeText={setConditions} />

        <TouchableOpacity style={styles.generateBtn} onPress={() => setView('plan')} activeOpacity={0.85}>
          <LinearGradient colors={['#00C897','#00A87D']} style={styles.generateBtnGradient}>
            <Text style={styles.generateBtnText}>Generate My Plan</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editManuallyBtn} onPress={() => setView('plan')}>
          <Text style={styles.editManuallyBtnText}>Edit Manually</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Plan view ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.planHeader}>
        <Text style={styles.planHeaderTitle}>🥗 Diet Plan</Text>
        <TouchableOpacity style={styles.regenBtn} onPress={() => setView('form')} activeOpacity={0.8}>
          <LinearGradient colors={['#00C897','#FF884B']} style={styles.regenBtnGradient}
            start={{ x:0, y:0 }} end={{ x:1, y:0 }}>
            <Text style={styles.regenBtnText}>⟳ Regenerate</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <View style={styles.daysScrollerWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroller}>
          {DAY_SHORT.map((d, i) => (
            <TouchableOpacity key={d}
              style={[styles.dayChip, activeDay === i && styles.dayChipActive]}
              onPress={() => setActiveDay(i)}
            >
              <Text style={[styles.dayChipText, activeDay === i && styles.dayChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.planScroll} contentContainerStyle={styles.planContent}>
        {/* Meal cards */}
        {MEALS.map(meal => {
          const items = dayPlan[meal] || [];
          const mealCal = items.reduce((s,i) => s + (i.calories||0), 0);
          return (
            <View key={meal} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealIcon}>{MEAL_ICONS[meal]}</Text>
                  <Text style={styles.mealTitle}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                  <Text style={styles.mealCalBadge}>{mealCal} kcal</Text>
                </View>
                <TouchableOpacity onPress={() => openEdit(meal)}>
                  <Text style={styles.editIcon}>✏️ Edit</Text>
                </TouchableOpacity>
              </View>
              {items.map((item, idx) => {
                const macroKey = `${meal}-${idx}`;
                const isExpanded = expandedMacros.has(macroKey);
                return (
                  <View key={idx} style={styles.mealItemCard}>
                    <View style={styles.mealItemRow}>
                      <Text style={styles.mealItemName}>{item.name}</Text>
                      <TouchableOpacity
                        style={styles.seeMacrosBtn}
                        onPress={() => toggleMacros(macroKey)}
                      >
                        <Text style={styles.seeMacrosBtnText}>
                          {isExpanded ? 'Hide' : 'See Macros'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {isExpanded && (
                      <Text style={styles.mealItemMacros}>
                        {item.calories} kcal  ·  {item.protein}g protein  ·  {item.carbs}g carbs  ·  {item.fat}g fat
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Daily totals */}
        <View style={styles.dayTotalsCard}>
          <Text style={styles.dayTotalsTitle}>Daily Totals</Text>
          <View style={styles.dayTotalsGrid}>
            {[
              { label:'Calories', value: dayTotals.calories        },
              { label:'Protein',  value: dayTotals.protein + 'g'  },
              { label:'Carbs',    value: dayTotals.carbs + 'g'    },
              { label:'Fat',      value: dayTotals.fat + 'g'      },
            ].map(({ label, value }) => (
              <View key={label} style={styles.dayTotalBox}>
                <Text style={styles.dayTotalValue}>{value}</Text>
                <Text style={styles.dayTotalLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editingMeal !== null} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitleIcon}>{editingMeal ? MEAL_ICONS[editingMeal] : ''}</Text>
              <Text style={styles.modalTitle}>
                {editingMeal ? editingMeal.charAt(0).toUpperCase() + editingMeal.slice(1) : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setEditingMeal(null)} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {editItems.map((item, idx) => (
              <View key={idx} style={styles.editItemRow}>
                <View style={styles.editItemInputs}>
                  <TextInput style={styles.editItemNameInput} value={item.name}
                    onChangeText={val => { const n=[...editItems]; n[idx]={...n[idx],name:val}; setEditItems(n); }} />
                  <TextInput style={styles.editItemQtyInput} placeholder="e.g. 100g"
                    placeholderTextColor="#555" defaultValue="1 serving"
                    onChangeText={val => { const n=[...editItems]; n[idx]={...n[idx],quantity:val}; setEditItems(n); }} />
                </View>
                <View style={styles.editItemStats}>
                  <Text style={styles.editItemStatText}>
                    {item.calories} kcal | {item.protein}P | {item.carbs}C | {item.fat}F
                  </Text>
                  <TouchableOpacity style={styles.deleteBtn}
                    onPress={() => setEditItems(prev => prev.filter((_,i) => i !== idx))}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add new item */}
            <View style={styles.addNewItemSection}>
              <Text style={styles.addNewItemTitle}>Add New Item</Text>
              <View style={styles.addNewItemRow}>
                <TextInput style={styles.newItemNameInput} placeholder="Food name" placeholderTextColor="#666" />
                <TextInput style={styles.newItemQtyInput} placeholder="e.g. 100g" placeholderTextColor="#666" />
              </View>
              <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Add</Text>
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
  container:          { flex:1, backgroundColor:'#121212' },
  scrollContent:      { padding:16, paddingBottom:40 },
  // locked
  lockedContainer:    { flex:1, backgroundColor:'#121212', justifyContent:'center', alignItems:'center', padding:24 },
  lockIcon:           { fontSize:64, marginBottom:16 },
  lockedTitle:        { fontSize:24, fontWeight:'bold', color:'#FFF', marginBottom:8 },
  lockedSubtitle:     { fontSize:16, color:'#9E9E9E', textAlign:'center', marginBottom:32 },
  featureList:        { marginBottom:32 },
  featureItem:        { fontSize:16, color:'#FFF', marginBottom:12 },
  upgradeButton:      { width:'100%', borderRadius:12, overflow:'hidden', marginBottom:16 },
  upgradeGradient:    { paddingVertical:16, alignItems:'center' },
  upgradeButtonText:  { color:'#FFF', fontSize:16, fontWeight:'bold' },
  manualButton:       { paddingVertical:16, width:'100%', alignItems:'center', borderRadius:12, borderWidth:1, borderColor:'#2C2C2C' },
  manualButtonText:   { color:'#9E9E9E', fontSize:16, fontWeight:'600' },
  // form
  formHeader:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16, marginTop:16 },
  formTitle:          { fontSize:24, fontWeight:'bold', color:'#FFF' },
  usageBadge:         { backgroundColor:'rgba(0,200,151,0.2)', paddingHorizontal:12, paddingVertical:6, borderRadius:16 },
  usageText:          { color:'#00C897', fontSize:12, fontWeight:'bold' },
  targetCalBanner:    { backgroundColor:'#0d2b22', borderRadius:12, padding:14, marginBottom:20, borderWidth:1, borderColor:'#00C89740' },
  targetCalText:      { color:'#00C897', fontSize:16, fontWeight:'700', marginBottom:4 },
  targetCalSub:       { color:'#9E9E9E', fontSize:12 },
  label:              { fontSize:16, color:'#FFF', marginBottom:12, fontWeight:'600' },
  chipContainer:      { flexDirection:'row', flexWrap:'wrap', marginBottom:24 },
  chip:               { backgroundColor:'#2C2C2C', paddingHorizontal:16, paddingVertical:8, borderRadius:20, marginRight:8, marginBottom:8 },
  chipActive:         { backgroundColor:'#00C897' },
  chipText:           { color:'#9E9E9E', fontSize:14 },
  chipTextActive:     { color:'#121212', fontWeight:'bold' },
  input:              { backgroundColor:'#1E1E1E', borderWidth:1, borderColor:'#2C2C2C', borderRadius:12, padding:16, color:'#FFF', marginBottom:24, fontSize:16 },
  generateBtn:        { borderRadius:12, overflow:'hidden', marginTop:8, marginBottom:16 },
  generateBtnGradient:{ paddingVertical:16, alignItems:'center' },
  generateBtnText:    { color:'#FFF', fontSize:16, fontWeight:'bold' },
  editManuallyBtn:    { paddingVertical:16, alignItems:'center', borderRadius:12, borderWidth:1, borderColor:'#2C2C2C' },
  editManuallyBtnText:{ color:'#FFF', fontSize:16, fontWeight:'600' },
  // plan header
  planHeader:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:56, paddingBottom:12, paddingHorizontal:20, backgroundColor:'#121212' },
  planHeaderTitle:    { color:'#fff', fontSize:22, fontWeight:'800' },
  regenBtn:           { borderRadius:10, overflow:'hidden' },
  regenBtnGradient:   { paddingHorizontal:14, paddingVertical:8 },
  regenBtnText:       { color:'#fff', fontSize:13, fontWeight:'700' },
  // day selector
  daysScrollerWrapper:{ borderBottomWidth:1, borderBottomColor:'#2C2C2C', backgroundColor:'#1E1E1E' },
  daysScroller:       { paddingHorizontal:16, paddingVertical:12, flexDirection:'row', alignItems:'center' },
  dayChip:            { backgroundColor:'#2C2C2C', paddingHorizontal:16, paddingVertical:8, borderRadius:20, marginRight:12 },
  dayChipActive:      { backgroundColor:'#00C897' },
  dayChipText:        { color:'#9E9E9E', fontWeight:'600', fontSize:14 },
  dayChipTextActive:  { color:'#121212', fontWeight:'bold' },
  // plan scroll
  planScroll:         { flex:1 },
  planContent:        { padding:16, paddingBottom:40, gap:12 },
  // meal card
  mealCard:           { backgroundColor:'#1E1E1E', borderRadius:16, padding:16, borderWidth:1, borderColor:'#2C2C2C', gap:10 },
  mealHeader:         { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  mealTitleRow:       { flexDirection:'row', alignItems:'center', gap:8 },
  mealIcon:           { fontSize:18 },
  mealTitle:          { color:'#fff', fontSize:16, fontWeight:'700' },
  mealCalBadge:       { color:'#00C897', fontSize:12, fontWeight:'600' },
  editIcon:           { color:'#9E9E9E', fontSize:13 },
  mealItemCard:       { backgroundColor:'#121212', borderRadius:10, padding:12, borderWidth:1, borderColor:'#2C2C2C' },
  mealItemRow:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  mealItemName:       { color:'#E0E0E0', fontSize:14, fontWeight:'600', flex:1, marginRight:8 },
  mealItemMacros:     { color:'#666', fontSize:12, marginTop:6 },
  seeMacrosBtn:       { backgroundColor:'#1E1E1E', borderRadius:6, paddingHorizontal:8, paddingVertical:4, borderWidth:1, borderColor:'#2C2C2C' },
  seeMacrosBtnText:   { color:'#00C897', fontSize:11, fontWeight:'600' },
  // totals
  dayTotalsCard:      { backgroundColor:'#1E1E1E', borderRadius:16, padding:16, borderWidth:1, borderColor:'#2C2C2C' },
  dayTotalsTitle:     { color:'#fff', fontSize:16, fontWeight:'700', marginBottom:12 },
  dayTotalsGrid:      { flexDirection:'row', justifyContent:'space-between' },
  dayTotalBox:        { alignItems:'center' },
  dayTotalValue:      { color:'#00C897', fontSize:20, fontWeight:'800' },
  dayTotalLabel:      { color:'#666', fontSize:12, marginTop:4 },
  // modal
  modalContainer:     { flex:1, backgroundColor:'#1a1a1a', marginTop:100, borderTopLeftRadius:24, borderTopRightRadius:24 },
  modalHeader:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, borderBottomWidth:1, borderBottomColor:'#2C2C2C' },
  modalTitleRow:      { flexDirection:'row', alignItems:'center', gap:8 },
  modalTitleIcon:     { fontSize:20 },
  modalTitle:         { color:'#fff', fontSize:18, fontWeight:'700' },
  saveBtn:            { backgroundColor:'#00C897', paddingHorizontal:16, paddingVertical:8, borderRadius:10 },
  saveBtnText:        { color:'#121212', fontWeight:'700', fontSize:14 },
  modalScroll:        { padding:20 },
  editItemRow:        { backgroundColor:'#121212', borderRadius:12, padding:14, marginBottom:10, borderWidth:1, borderColor:'#2C2C2C', gap:8 },
  editItemInputs:     { flexDirection:'row', gap:8 },
  editItemNameInput:  { flex:2, backgroundColor:'#1E1E1E', color:'#fff', borderRadius:8, padding:10, borderWidth:1, borderColor:'#2C2C2C' },
  editItemQtyInput:   { flex:1, backgroundColor:'#1E1E1E', color:'#fff', borderRadius:8, padding:10, borderWidth:1, borderColor:'#2C2C2C' },
  editItemStats:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  editItemStatText:   { color:'#666', fontSize:12 },
  deleteBtn:          { padding:4 },
  deleteBtnText:      { fontSize:16 },
  addNewItemSection:  { backgroundColor:'#121212', borderRadius:12, padding:14, borderWidth:1, borderColor:'#2C2C2C', marginBottom:12, gap:10 },
  addNewItemTitle:    { color:'#9E9E9E', fontSize:13, fontWeight:'700' },
  addNewItemRow:      { flexDirection:'row', gap:8 },
  newItemNameInput:   { flex:2, backgroundColor:'#1E1E1E', color:'#fff', borderRadius:8, padding:10, borderWidth:1, borderColor:'#2C2C2C' },
  newItemQtyInput:    { flex:1, backgroundColor:'#1E1E1E', color:'#fff', borderRadius:8, padding:10, borderWidth:1, borderColor:'#2C2C2C' },
  addBtn:             { backgroundColor:'#003d2e', borderRadius:8, padding:12, alignItems:'center', borderWidth:1, borderColor:'#00C897' },
  addBtnText:         { color:'#00C897', fontWeight:'700' },
  cancelBtn:          { paddingVertical:16, alignItems:'center' },
  cancelBtnText:      { color:'#555', fontSize:14 },
});
