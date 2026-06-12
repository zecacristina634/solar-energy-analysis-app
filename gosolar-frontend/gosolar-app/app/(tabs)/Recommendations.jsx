import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Zap, Play, Square, X, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../store/themeStore';
import { useAuth } from '../../store/authStore';
import {
  getRecommendations, generateRecommendations,
  startAutoRecommendations, stopAutoRecommendations,
  markAsRead, markAllAsRead, deleteRecommendation
} from '../../services/recommendationService';
import { getSystems } from '../../services/systemService';
import AppHeader from '../../components/AppHeader';

const TYPE_CONFIG = {
  shift_load:      { label: 'Shift Load',      color: '#7ed957', bgLight: '#d4edda', textLight: '#155724' },
  high_surplus:    { label: 'High Surplus',     color: '#7ed957', bgLight: '#d4edda', textLight: '#155724' },
  forecast_based:  { label: 'Forecast',         color: '#5c7ea8', bgLight: '#cce5ff', textLight: '#004085' },
  low_performance: { label: 'Low Performance',  color: '#f5a623', bgLight: '#fff3cd', textLight: '#856404' },
};

export default function Recommendations() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { user } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const { systems } = await getSystems();
      if (systems && systems.length > 0) {
        const activeSystem = systems.find(s => s.system_status === 'active') || systems[0];
        setSystem(activeSystem);
      }
      const { recommendations } = await getRecommendations();
      setRecommendations(recommendations || []);
    } catch (err) {
      console.error('Recommendations load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleGenerate = async () => {
    if (!system) {
      Alert.alert('Error', 'No system found');
      return;
    }
    try {
      setGenerating(true);
      const result = await generateRecommendations(system.id_system);
      if (result.recommendations?.length > 0) {
        Alert.alert('Success', `${result.recommendations.length} recommendations generated!`);
        loadData();
      } else {
        Alert.alert('Info', result.message || 'No recommendations generated');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoToggle = async () => {
    if (!system) return;
    try {
      if (autoRunning) {
        await stopAutoRecommendations(system.id_system);
        setAutoRunning(false);
      } else {
        await startAutoRecommendations(system.id_system);
        setAutoRunning(true);
      }
    } catch (err) {
      setAutoRunning(false);
      Alert.alert('Info', err.response?.data?.message || 'Failed');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setRecommendations(prev =>
        prev.map(r => r.id_recommendation === id ? { ...r, status: 'read' } : r)
      );
      if (selectedRec?.id_recommendation === id) {
        setSelectedRec({ ...selectedRec, status: 'read' });
      }
    } catch (err) {
      console.error('Mark as read error:', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setRecommendations(prev => prev.map(r => ({ ...r, status: 'read' })));
    } catch (err) {
      console.error('Mark all as read error:', err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRecommendation(id);
      setRecommendations(prev => prev.filter(r => r.id_recommendation !== id));
      setSelectedRec(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete recommendation');
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const typeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.shift_load;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Recommendations"
        right={
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Butoane */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.btnPrimary, generating && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            <Zap size={14} color={colors.primaryDark} />
            <Text style={styles.btnPrimaryText}>{generating ? 'Generating...' : 'Generate Now'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, autoRunning && styles.btnStop]}
            onPress={handleAutoToggle}
          >
            {autoRunning
              ? <><Square size={14} color={colors.error} /><Text style={[styles.btnOutlineText, { color: colors.error }]}>Stop Auto</Text></>
              : <><Play size={14} color={colors.accent} /><Text style={styles.btnOutlineText}>Start Auto</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Lista recomandări */}
        {recommendations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <Text style={styles.emptySubText}>Press Generate Now to get AI recommendations</Text>
          </View>
        ) : (
          recommendations.map(rec => {
            const tc = typeConfig(rec.recommendation_type);
            const isUnread = rec.status === 'unread';
            return (
              <TouchableOpacity
                key={rec.id_recommendation}
                style={[styles.recCard, { borderLeftColor: tc.color }, !isUnread && styles.recCardRead]}
                onPress={() => setSelectedRec(rec)}
              >
                <View style={styles.recTop}>
                  <View style={styles.recTopLeft}>
                    {isUnread && <View style={styles.unreadDot} />}
                    <View style={[styles.badge, { backgroundColor: tc.bgLight }]}>
                      <Text style={[styles.badgeText, { color: tc.textLight }]}>{tc.label}</Text>
                    </View>
                  </View>
                  <View style={styles.recTopRight}>
                    <Text style={styles.timeText}>{getTimeAgo(rec.created_at)}</Text>
                    {isUnread && (
                      <TouchableOpacity
                        style={styles.checkBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(rec.id_recommendation);
                        }}
                      >
                        <Check size={12} color={colors.accent} />
                        <Text style={styles.checkText}>read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={[styles.recTitle, !isUnread && styles.recTitleRead]} numberOfLines={2}>
                  {rec.title}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal detalii */}
      <Modal
        visible={!!selectedRec}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRec(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRec && (() => {
              const tc = typeConfig(selectedRec.recommendation_type);
              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={[styles.badge, { backgroundColor: tc.bgLight }]}>
                      <Text style={[styles.badgeText, { color: tc.textLight }]}>{tc.label}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedRec(null)}>
                      <X size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalTitle}>{selectedRec.title}</Text>
                  <Text style={styles.modalMessage}>{selectedRec.message}</Text>

                  {(selectedRec.estimated_saving_kwh || selectedRec.estimated_saving_money) && (
                    <View style={styles.savingsRow}>
                      {selectedRec.estimated_saving_kwh && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>~{parseFloat(selectedRec.estimated_saving_kwh).toFixed(1)} kWh</Text>
                        </View>
                      )}
                      {selectedRec.estimated_saving_money && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>~{parseFloat(selectedRec.estimated_saving_money).toFixed(2)} lei</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={styles.modalTime}>{getTimeAgo(selectedRec.created_at)}</Text>

                  <View style={styles.modalActions}>
                    {selectedRec.status === 'unread' && (
                      <TouchableOpacity
                        style={[styles.markReadBtn, { flex: 1 }]}
                        onPress={() => handleMarkAsRead(selectedRec.id_recommendation)}
                      >
                        <Check size={16} color={colors.primaryDark} />
                        <Text style={styles.markReadBtnText}>Mark as read</Text>
                      </TouchableOpacity>
                    )}
                    {selectedRec.status === 'read' && (
                      <View style={[styles.alreadyRead, { flex: 1 }]}>
                        <Text style={styles.alreadyReadText}>Already read</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(selectedRec.id_recommendation)}
                    >
                      <Trash2 size={16} color={colors.error} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
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
  markAllText: { color: colors.textSecondary, fontSize: 13 },
  scroll: { flex: 1, padding: 12 },
  buttonsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btnPrimary: {
    flex: 1, backgroundColor: colors.accent, borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnPrimaryText: { color: colors.primaryDark, fontSize: 13, fontWeight: '500' },
  btnDisabled: { opacity: 0.6 },
  btnOutline: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnStop: { borderColor: colors.error },
  btnOutlineText: { color: colors.accent, fontSize: 13 },
  emptyCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 24, alignItems: 'center',
  },
  emptyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '500', marginBottom: 6 },
  emptySubText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  recCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3,
  },
  recCardRead: { opacity: 0.6 },
  recTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  recTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '500' },
  timeText: { color: colors.textSecondary, fontSize: 10 },
  checkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  checkText: { color: colors.accent, fontSize: 9 },
  recTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  recTitleRead: { color: colors.textSecondary },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, borderTopWidth: 1, borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '500', marginBottom: 10 },
  modalMessage: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  savingsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  savingsBadge: { backgroundColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  savingsText: { color: colors.accent, fontSize: 12, fontWeight: '500' },
  modalTime: { color: colors.textSecondary, fontSize: 11, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  markReadBtn: {
    backgroundColor: colors.accent, borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  markReadBtnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '500' },
  alreadyRead: { alignItems: 'center', justifyContent: 'center', padding: 14 },
  alreadyReadText: { color: colors.textSecondary, fontSize: 13 },
  deleteBtn: {
    borderWidth: 1, borderColor: colors.error, borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  deleteBtnText: { color: colors.error, fontSize: 14, fontWeight: '500' },
});