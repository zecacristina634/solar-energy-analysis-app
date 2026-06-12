import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronDown, ChevronUp, Trash2, Edit, X, Check } from 'lucide-react-native';
import { useTheme } from '../../store/themeStore';
import {
  getConstantAppliances, addConstantAppliance, updateConstantAppliance, deleteConstantAppliance,
  getShiftableLoads, addShiftableLoad, updateShiftableLoad, deleteShiftableLoad,
  getCatalog
} from '../../services/applianceService';

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#e74c3c', bg: '#fde8e8' },
  medium: { label: 'Medium', color: '#f5a623', bg: '#fff3cd' },
  low:    { label: 'Low',    color: '#7ed957', bg: '#d4edda' },
};

const ENERGY_CLASSES = {
  'A+++': 0.40, 'A++': 0.50, 'A+': 0.60,
  'A': 0.70, 'B': 0.80, 'C': 0.90, 'D': 1.00,
};
const ENERGY_CLASS_LIST = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D'];

const CATEGORIES = ['Bathroom', 'Cleaning', 'Electronics', 'Entertainment', 'Household', 'HVAC', 'Kitchen', 'Laundry', 'Lighting', 'Personal Care'];

export default function ShiftableLoads() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState('constant');
  const [constantAppliances, setConstantAppliances] = useState([]);
  const [shiftableLoads, setShiftableLoads] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [expandedConstantId, setExpandedConstantId] = useState(null);
  const [expandedShiftableId, setExpandedShiftableId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedShiftableCategory, setSelectedShiftableCategory] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('constant');
  const [fromCatalog, setFromCatalog] = useState(true);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);

  const [form, setForm] = useState({
    id_catalog_appliance: null,
    custom_name: '',
    custom_nominal_power_w: '',
    base_nominal_power_w: '',
    energy_class: '',
    quantity: '1',
    preferred_start_time: '09:00',
    preferred_end_time: '17:00',
    custom_usage_time_minutes: '60',
    priority_level: 'medium',
  });

  const loadData = useCallback(async () => {
    try {
      const constRes = await getConstantAppliances();
      const shiftRes = await getShiftableLoads();
      const catRes = await getCatalog();
      
      setConstantAppliances(constRes.appliances || []);
      setShiftableLoads(shiftRes.appliances || []);
      setCatalog(catRes.appliances || []);
      
    } catch (err) {
      console.error('Loads error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const resetForm = () => {
    setForm({
      id_catalog_appliance: null,
      custom_name: '',
      custom_nominal_power_w: '',
      base_nominal_power_w: '',
      energy_class: '',
      quantity: '1',
      preferred_start_time: '09:00',
      preferred_end_time: '17:00',
      custom_usage_time_minutes: '60',
      priority_level: 'medium',
    });
    setFromCatalog(true);
    setEditingItem(null);
  };

  const openAddModal = (type) => {
    resetForm();
    setModalType(type);
    setShowModal(true);
  };

  const openEditModal = (item, type) => {
    setModalType(type);
    setEditingItem(item);
    setFromCatalog(!!item.id_catalog_appliance);
    const power = String(item.custom_nominal_power_w || item.catalog_power_w || '');
    setForm({
      id_catalog_appliance: item.id_catalog_appliance || null,
      custom_name: item.custom_name || '',
      custom_nominal_power_w: power,
      base_nominal_power_w: power,
      energy_class: '',
      quantity: String(item.quantity || 1),
      preferred_start_time: item.preferred_start_time || '09:00',
      preferred_end_time: item.preferred_end_time || '17:00',
      custom_usage_time_minutes: String(item.custom_usage_time_minutes || item.catalog_usage_time || '60'),
      priority_level: item.priority_level || 'medium',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.custom_name && !form.id_catalog_appliance) {
      Alert.alert('Error', 'Please select from catalog or enter a custom name');
      return;
    }
    try {
      const data = {
        id_catalog_appliance: fromCatalog ? form.id_catalog_appliance : null,
        custom_name: !fromCatalog ? form.custom_name : (form.custom_name || null),
        custom_nominal_power_w: form.custom_nominal_power_w ? parseFloat(form.custom_nominal_power_w) : null,
        quantity: parseInt(form.quantity) || 1,
      };
      if (modalType === 'shiftable') {
        data.preferred_start_time = form.preferred_start_time;
        data.preferred_end_time = form.preferred_end_time;
        data.custom_usage_time_minutes = parseInt(form.custom_usage_time_minutes) || 60;
        data.priority_level = form.priority_level;
      }
      if (editingItem) {
        if (modalType === 'constant') {
          await updateConstantAppliance(editingItem.id_user_constant_appliance, data);
        } else {
          await updateShiftableLoad(editingItem.id_user_flexible_appliance, data);
        }
      } else {
        if (modalType === 'constant') {
          await addConstantAppliance(data);
        } else {
          await addShiftableLoad(data);
        }
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (item, type) => {
    Alert.alert('Delete', `Delete ${item.custom_name || item.catalog_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            if (type === 'constant') {
              await deleteConstantAppliance(item.id_user_constant_appliance);
            } else {
              await deleteShiftableLoad(item.id_user_flexible_appliance);
            }
            loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  const selectFromCatalog = (item) => {
    const power = String(item.nominal_power_w || '');
    setForm(prev => ({
      ...prev,
      id_catalog_appliance: item.id_catalog_appliance,
      custom_name: '',
      custom_nominal_power_w: power,
      base_nominal_power_w: power,
      energy_class: '',
    }));
    setShowCatalogPicker(false);
    if (!showModal) {
      setModalType('shiftable');
      setFromCatalog(true);
      setShowModal(true);
    }
  };

  const selectedCatalogItem = catalog.find(c => c.id_catalog_appliance === form.id_catalog_appliance);

  const filteredConstantCatalog = catalog
    .filter(c => c.appliance_type === 'constant')
    .filter(c => !selectedCategory || c.appliance_category === selectedCategory);

  const shiftableCategories = [...new Set(
    shiftableLoads.map(a => a.catalog_category).filter(Boolean)
  )].sort();

  const filteredShiftableLoads = shiftableLoads.filter(
    a => !selectedShiftableCategory || a.catalog_category === selectedShiftableCategory
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Loads</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'constant' && styles.tabActive]}
          onPress={() => setActiveTab('constant')}
        >
          <Text style={[styles.tabText, activeTab === 'constant' && styles.tabTextActive]}>Constant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shiftable' && styles.tabActive]}
          onPress={() => setActiveTab('shiftable')}
        >
          <Text style={[styles.tabText, activeTab === 'shiftable' && styles.tabTextActive]}>Shiftable</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {activeTab === 'constant' ? (
          <>
            {constantAppliances.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>YOUR APPLIANCES</Text>
                {constantAppliances.map(item => (
                  <TouchableOpacity
                    key={item.id_user_constant_appliance}
                    style={styles.card}
                    onPress={() => setExpandedConstantId(expandedConstantId === item.id_user_constant_appliance ? null : item.id_user_constant_appliance)}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardName}>{item.custom_name || item.catalog_name}</Text>
                      {expandedConstantId === item.id_user_constant_appliance
                        ? <ChevronUp size={16} color={colors.textSecondary} />
                        : <ChevronDown size={16} color={colors.textSecondary} />
                      }
                    </View>
                    {expandedConstantId === item.id_user_constant_appliance && (
                      <View style={styles.cardBody}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Power</Text>
                          <Text style={styles.detailValue}>{item.custom_nominal_power_w || item.catalog_power_w} W</Text>
                        </View>
                        <View style={styles.cardActions}>
                          <TouchableOpacity style={styles.btnEdit} onPress={() => openEditModal(item, 'constant')}>
                            <Edit size={12} color={colors.textSecondary} />
                            <Text style={styles.btnEditText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item, 'constant')}>
                            <Trash2 size={12} color={colors.error} />
                            <Text style={styles.btnDeleteText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>ADD FROM CATALOG</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
                <TouchableOpacity
                  style={[styles.categoryBtn, !selectedCategory && styles.categoryBtnActive]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[styles.categoryBtnText, !selectedCategory && styles.categoryBtnTextActive]}>All</Text>
                </TouchableOpacity>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    <Text style={[styles.categoryBtnText, selectedCategory === cat && styles.categoryBtnTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {filteredConstantCatalog.map(item => {
              const isAdded = constantAppliances.some(a => a.id_catalog_appliance === item.id_catalog_appliance);
              return (
                <View
                  key={item.id_catalog_appliance}
                  style={[styles.catalogCheckItem, isAdded && styles.catalogCheckItemActive]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={async () => {
                      if (isAdded) {
                        const found = constantAppliances.find(a => a.id_catalog_appliance === item.id_catalog_appliance);
                        if (found) handleDelete(found, 'constant');
                        return;
                      }
                      try {
                        await addConstantAppliance({ id_catalog_appliance: item.id_catalog_appliance, quantity: 1 });
                      } catch {
                      } finally {
                        loadData();
                      }
                    }}
                  >
                    <View style={styles.checkboxRow}>
                      <View style={[styles.checkbox, isAdded && styles.checkboxChecked]}>
                        {isAdded && <Check size={12} color="#fff" />}
                      </View>
                      <View>
                        <Text style={styles.catalogCheckName}>{item.appliance_name}</Text>
                        <Text style={styles.catalogCheckPower}>{item.nominal_power_w}W · {item.appliance_category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {isAdded && (
                    <TouchableOpacity
                      style={styles.catalogAddMoreBtn}
                      onPress={async () => {
                        try {
                          await addConstantAppliance({ id_catalog_appliance: item.id_catalog_appliance, quantity: 1 });
                        } catch {
                        } finally {
                          loadData();
                        }
                      }}
                    >
                      <Plus size={16} color={colors.accent} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <TouchableOpacity style={styles.addCustomBtn} onPress={() => openAddModal('constant')}>
              <Plus size={16} color={colors.primaryDark} />
              <Text style={styles.addCustomBtnText}>Add Custom Appliance</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.shiftableActionsRow}>
              <TouchableOpacity style={[styles.addCustomBtn, { flex: 1, marginTop: 0, marginBottom: 0 }]} onPress={() => openAddModal('shiftable')}>
                <Plus size={16} color={colors.primaryDark} />
                <Text style={styles.addCustomBtnText}>Add New</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.catalogBrowseBtn, { flex: 1 }]}
                onPress={() => { resetForm(); setModalType('shiftable'); setFromCatalog(true); setShowCatalogPicker(true); }}
              >
                <Text style={styles.catalogBrowseBtnText}>View Catalog</Text>
              </TouchableOpacity>
            </View>

            {shiftableCategories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
                  <TouchableOpacity
                    style={[styles.categoryBtn, !selectedShiftableCategory && styles.categoryBtnActive]}
                    onPress={() => setSelectedShiftableCategory(null)}
                  >
                    <Text style={[styles.categoryBtnText, !selectedShiftableCategory && styles.categoryBtnTextActive]}>All</Text>
                  </TouchableOpacity>
                  {shiftableCategories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryBtn, selectedShiftableCategory === cat && styles.categoryBtnActive]}
                      onPress={() => setSelectedShiftableCategory(selectedShiftableCategory === cat ? null : cat)}
                    >
                      <Text style={[styles.categoryBtnText, selectedShiftableCategory === cat && styles.categoryBtnTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {shiftableLoads.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No shiftable loads</Text>
                <Text style={styles.emptySubText}>Add appliances that can be scheduled</Text>
              </View>
            ) : filteredShiftableLoads.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No loads in this category</Text>
              </View>
            ) : (
              filteredShiftableLoads.map(item => {
                const pc = PRIORITY_CONFIG[item.priority_level] || PRIORITY_CONFIG.medium;
                return (
                  <TouchableOpacity
                    key={item.id_user_flexible_appliance}
                    style={styles.card}
                    onPress={() => setExpandedShiftableId(expandedShiftableId === item.id_user_flexible_appliance ? null : item.id_user_flexible_appliance)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardLeft}>
                        <View style={[styles.priorityDot, { backgroundColor: pc.color }]} />
                        <Text style={styles.cardName}>{item.custom_name || item.catalog_name}</Text>
                      </View>
                      {expandedShiftableId === item.id_user_flexible_appliance
                        ? <ChevronUp size={16} color={colors.textSecondary} />
                        : <ChevronDown size={16} color={colors.textSecondary} />
                      }
                    </View>
                    {expandedShiftableId === item.id_user_flexible_appliance && (
                      <View style={styles.cardBody}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Power</Text>
                          <Text style={styles.detailValue}>{item.custom_nominal_power_w || item.catalog_power_w} W</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Duration</Text>
                          <Text style={styles.detailValue}>{item.custom_usage_time_minutes || item.catalog_usage_time} min</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Preferred time</Text>
                          <Text style={styles.detailValue}>{item.preferred_start_time || 'N/A'} - {item.preferred_end_time || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Priority</Text>
                          <Text style={[styles.detailValue, { color: pc.color }]}>{pc.label}</Text>
                        </View>
                        <View style={styles.cardActions}>
                          <TouchableOpacity style={styles.btnEdit} onPress={() => openEditModal(item, 'shiftable')}>
                            <Edit size={12} color={colors.textSecondary} />
                            <Text style={styles.btnEditText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item, 'shiftable')}>
                            <Trash2 size={12} color={colors.error} />
                            <Text style={styles.btnDeleteText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Edit' : 'Add'} {modalType === 'constant' ? 'Constant Appliance' : 'Shiftable Load'}
                </Text>
                <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {modalType === 'shiftable' && !editingItem && (
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, fromCatalog && styles.toggleBtnActive]}
                    onPress={() => setFromCatalog(true)}
                  >
                    <Text style={[styles.toggleBtnText, fromCatalog && styles.toggleBtnTextActive]}>From Catalog</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !fromCatalog && styles.toggleBtnActive]}
                    onPress={() => setFromCatalog(false)}
                  >
                    <Text style={[styles.toggleBtnText, !fromCatalog && styles.toggleBtnTextActive]}>Custom</Text>
                  </TouchableOpacity>
                </View>
              )}

              {modalType === 'shiftable' && fromCatalog && !editingItem && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>APPLIANCE</Text>
                  <TouchableOpacity style={styles.catalogSelector} onPress={() => setShowCatalogPicker(true)}>
                    <Text style={[styles.catalogSelectorText, !selectedCatalogItem && { color: colors.textSecondary }]}>
                      {selectedCatalogItem ? selectedCatalogItem.appliance_name : 'Select from catalog...'}
                    </Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              {(modalType === 'constant' || modalType === 'shiftable' && !fromCatalog) && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>NAME</Text>
                  <TextInput
                    style={[styles.input, form.id_catalog_appliance && styles.inputReadOnly]}
                    value={form.id_catalog_appliance ? (editingItem?.catalog_name || '') : form.custom_name}
                    onChangeText={v => setForm(p => ({ ...p, custom_name: v }))}
                    placeholder="Appliance name"
                    placeholderTextColor={colors.textSecondary}
                    editable={!form.id_catalog_appliance}
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>POWER (W)</Text>
                <TextInput
                  style={styles.input}
                  value={form.base_nominal_power_w}
                  onChangeText={v => setForm(p => ({
                    ...p,
                    base_nominal_power_w: v,
                    custom_nominal_power_w: p.energy_class && v && !isNaN(parseFloat(v))
                      ? String(Math.round(parseFloat(v) * ENERGY_CLASSES[p.energy_class]))
                      : v,
                  }))}
                  placeholder="e.g. 2000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                {form.energy_class && form.base_nominal_power_w && !isNaN(parseFloat(form.base_nominal_power_w)) ? (
                  <Text style={styles.effectivePowerHint}>
                    Effective: {Math.round(parseFloat(form.base_nominal_power_w) * ENERGY_CLASSES[form.energy_class])} W
                  </Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ENERGY CLASS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.energyClassRow}>
                    {ENERGY_CLASS_LIST.map(cls => {
                      const isSelected = form.energy_class === cls;
                      return (
                        <TouchableOpacity
                          key={cls}
                          style={[styles.energyClassBtn, isSelected && styles.energyClassBtnActive]}
                          onPress={() => setForm(p => {
                            const newClass = p.energy_class === cls ? '' : cls;
                            const base = p.base_nominal_power_w || p.custom_nominal_power_w;
                            const parsedBase = parseFloat(base);
                            return {
                              ...p,
                              energy_class: newClass,
                              custom_nominal_power_w: newClass && base && !isNaN(parsedBase)
                                ? String(Math.round(parsedBase * ENERGY_CLASSES[newClass]))
                                : (p.base_nominal_power_w || p.custom_nominal_power_w),
                            };
                          })}
                        >
                          <Text style={[styles.energyClassBtnText, isSelected && styles.energyClassBtnTextActive]}>
                            {cls}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {modalType === 'shiftable' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>DURATION (min)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.custom_usage_time_minutes}
                      onChangeText={v => setForm(p => ({ ...p, custom_usage_time_minutes: v }))}
                      placeholder="60"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>PREFERRED TIME</Text>
                    <View style={styles.timeRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={form.preferred_start_time}
                        onChangeText={v => setForm(p => ({ ...p, preferred_start_time: v }))}
                        placeholder="09:00"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <Text style={styles.timeSeparator}>-</Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={form.preferred_end_time}
                        onChangeText={v => setForm(p => ({ ...p, preferred_end_time: v }))}
                        placeholder="17:00"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>PRIORITY</Text>
                    <View style={styles.priorityRow}>
                      {['high', 'medium', 'low'].map(p => {
                        const pc = PRIORITY_CONFIG[p];
                        const isSelected = form.priority_level === p;
                        return (
                          <TouchableOpacity
                            key={p}
                            style={[styles.priorityBtn, isSelected && { backgroundColor: pc.bg, borderColor: pc.color }]}
                            onPress={() => setForm(prev => ({ ...prev, priority_level: p }))}
                          >
                            <Text style={[styles.priorityBtnText, isSelected && { color: pc.color }]}>{pc.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingItem ? 'Save Changes' : 'Add Appliance'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCatalogPicker} transparent animationType="slide" onRequestClose={() => setShowCatalogPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Appliance</Text>
              <TouchableOpacity onPress={() => setShowCatalogPicker(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {catalog.filter(c => c.appliance_type === 'flexible').map(item => (
                <TouchableOpacity
                  key={item.id_catalog_appliance}
                  style={styles.catalogItem}
                  onPress={() => selectFromCatalog(item)}
                >
                  <View>
                    <Text style={styles.catalogItemName}>{item.appliance_name}</Text>
                    <Text style={styles.catalogItemCategory}>{item.appliance_category}</Text>
                  </View>
                  <Text style={styles.catalogItemPower}>{item.nominal_power_w}W</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  center: { flex: 1, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.accent, fontSize: 16 },
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '500' },
  tabRow: {
    flexDirection: 'row', backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingBottom: 10, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: colors.primaryDark },
  scroll: { flex: 1, padding: 12 },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 11, fontWeight: '500',
    letterSpacing: 1, marginBottom: 8, marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 24, alignItems: 'center',
  },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '500', marginBottom: 6 },
  emptySubText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, marginBottom: 8, overflow: 'hidden',
  },
  cardHeader: {
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  cardBody: { padding: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.textSecondary, fontSize: 12 },
  detailValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnEdit: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  btnEditText: { color: colors.textSecondary, fontSize: 12 },
  btnDelete: {
    flex: 1, borderWidth: 1, borderColor: colors.error, borderRadius: 8, padding: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  btnDeleteText: { color: colors.error, fontSize: 12 },
  categoryBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  categoryBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryBtnText: { color: colors.textSecondary, fontSize: 12 },
  categoryBtnTextActive: { color: colors.primaryDark, fontWeight: '500' },
  catalogCheckItem: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, marginBottom: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  catalogCheckItemActive: { borderColor: colors.accent },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  catalogCheckName: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  catalogCheckPower: { color: colors.textSecondary, fontSize: 11 },
  catalogAddMoreBtn: {
    borderWidth: 1, borderColor: colors.accent, borderRadius: 6,
    padding: 6, marginLeft: 8,
  },
  shiftableActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 10 },
  addCustomBtn: {
    backgroundColor: colors.accent, borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 8, marginBottom: 10,
  },
  addCustomBtnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '500' },
  catalogBrowseBtn: {
    borderWidth: 1, borderColor: colors.accent, borderRadius: 10, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  catalogBrowseBtnText: { color: colors.accent, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%', borderTopWidth: 1, borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primaryDark,
  },
  toggleBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleBtnText: { color: colors.textSecondary, fontSize: 13 },
  toggleBtnTextActive: { color: colors.primaryDark, fontWeight: '500' },
  formGroup: { marginBottom: 14 },
  formLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '500', letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14,
  },
  inputReadOnly: { opacity: 0.5 },
  catalogSelector: {
    backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  catalogSelectorText: { color: colors.textPrimary, fontSize: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeSeparator: { color: colors.textSecondary, fontSize: 16 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primaryDark,
  },
  priorityBtnText: { color: colors.textSecondary, fontSize: 13 },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '500' },
  catalogItem: {
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5,
    borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  catalogItemName: { color: colors.textPrimary, fontSize: 14 },
  catalogItemCategory: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  catalogItemPower: { color: colors.textSecondary, fontSize: 13 },
  energyClassRow: { flexDirection: 'row', gap: 6 },
  energyClassBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primaryDark,
  },
  energyClassBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  energyClassBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  energyClassBtnTextActive: { color: colors.primaryDark, fontWeight: '700' },
  effectivePowerHint: { color: colors.accent, fontSize: 11, marginTop: 4, marginLeft: 2 },
});