import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sun, Moon, LogOut, Trash2, X } from 'lucide-react-native';
import { useAuth } from '../../store/authStore';
import { useTheme } from '../../store/themeStore';
import { getSystems, updateSystem, deleteSystem } from '../../services/systemService';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';

export default function Profile() {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditSystem, setShowEditSystem] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [systemForm, setSystemForm] = useState({
    system_name: '',
    peak_power_kwp: '',
    panel_orientation: '',
    tilt_angle_deg: '',
    latitude: '',
    longitude: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadData = useCallback(async () => {
    try {
      const { systems } = await getSystems();
      if (systems && systems.length > 0) {
        const activeSystem = systems.find(s => s.system_status === 'active') || systems[0];
        setSystem(activeSystem);
        setSystemForm({
          system_name: activeSystem.system_name || '',
          peak_power_kwp: String(activeSystem.peak_power_kwp || ''),
          panel_orientation: activeSystem.panel_orientation || '',
          tilt_angle_deg: String(activeSystem.tilt_angle_deg || ''),
          latitude: String(activeSystem.latitude || ''),
          longitude: String(activeSystem.longitude || ''),
        });
      }
    } catch (err) {
      console.error('Profile load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleEditSystem = async () => {
    try {
      await updateSystem(system.id_system, {
        system_name: systemForm.system_name,
        peak_power_kwp: parseFloat(systemForm.peak_power_kwp) || null,
        panel_orientation: systemForm.panel_orientation || null,
        tilt_angle_deg: parseFloat(systemForm.tilt_angle_deg) || null,
        latitude: parseFloat(systemForm.latitude) || null,
        longitude: parseFloat(systemForm.longitude) || null,
      });
      setShowEditSystem(false);
      loadData();
      Alert.alert('Success', 'System updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update system');
    }
  };

  const handleDeleteSystem = () => {
    Alert.alert(
      'Delete System',
      `Are you sure you want to delete "${system?.system_name}"? This will delete all measurements and data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteSystem(system.id_system);
              setSystem(null);
              Alert.alert('Success', 'System deleted');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete system');
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    try {
      // TODO: implement change password API call
      Alert.alert('Success', 'Password changed successfully');
      setShowChangePassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      Alert.alert('Error', 'Failed to change password');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Profile" hideLogo />

      <ScrollView style={styles.scroll}>

        {/* Logo */}
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/images/logo-gosolar1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.logoTitle}>GoSolar</Text>
            <Text style={styles.logoSub}>Solar Energy Monitor</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{user?.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.row} onPress={() => setShowChangePassword(true)}>
            <Text style={styles.rowLabel}>Password</Text>
            <Text style={styles.rowBtn}>Change →</Text>
          </TouchableOpacity>
        </View>

        {/* System */}
        <Text style={styles.sectionTitle}>SYSTEM</Text>
        {system ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Name</Text>
              <Text style={styles.rowValue}>{system.system_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Type</Text>
              <Text style={styles.rowValue}>{system.system_type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Peak Power</Text>
              <Text style={styles.rowValue}>{system.peak_power_kwp ? `${system.peak_power_kwp} kWp` : 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Orientation</Text>
              <Text style={styles.rowValue}>
                {system.panel_orientation || 'N/A'}{system.tilt_angle_deg ? ` · ${system.tilt_angle_deg}°` : ''}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Status</Text>
              <Text style={[styles.rowValue, { color: system.system_status === 'active' ? colors.accent : colors.error }]}>
                ● {system.system_status}
              </Text>
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <TouchableOpacity onPress={() => setShowEditSystem(true)}>
                <Text style={styles.rowBtn}>Edit System →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSystem}>
                <Text style={styles.rowBtnDanger}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>No system connected</Text>
            </View>
          </View>
        )}

        {/* Preferences */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              {isDark ? <Moon size={16} color={colors.textSecondary} /> : <Sun size={16} color={colors.textSecondary} />}
              <Text style={styles.rowLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, { backgroundColor: isDark ? colors.accent : colors.border }]}
              onPress={toggleTheme}
            >
              <View style={[styles.toggleDot, { right: isDark ? 2 : undefined, left: isDark ? undefined : 2 }]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
        <TouchableOpacity style={styles.btnDanger} onPress={logout}>
          <LogOut size={18} color={colors.error} />
          <Text style={styles.btnDangerText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteAccount}>
          <Trash2 size={18} color={colors.error} />
          <Text style={styles.btnDangerText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal Edit System */}
      <Modal visible={showEditSystem} transparent animationType="slide" onRequestClose={() => setShowEditSystem(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit System</Text>
                <TouchableOpacity onPress={() => setShowEditSystem(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {[
                { label: 'SYSTEM NAME', key: 'system_name', placeholder: 'My Solar System' },
                { label: 'PEAK POWER (kWp)', key: 'peak_power_kwp', placeholder: '5', numeric: true },
                { label: 'ORIENTATION', key: 'panel_orientation', placeholder: 'South' },
                { label: 'TILT ANGLE (°)', key: 'tilt_angle_deg', placeholder: '30', numeric: true },
                { label: 'LATITUDE', key: 'latitude', placeholder: '44.43', numeric: true },
                { label: 'LONGITUDE', key: 'longitude', placeholder: '26.10', numeric: true },
              ].map(field => (
                <View key={field.key} style={styles.formGroup}>
                  <Text style={styles.formLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={systemForm[field.key]}
                    onChangeText={v => setSystemForm(p => ({ ...p, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType={field.numeric ? 'numeric' : 'default'}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleEditSystem}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Change Password */}
      <Modal visible={showChangePassword} transparent animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'CURRENT PASSWORD', key: 'currentPassword' },
              { label: 'NEW PASSWORD', key: 'newPassword' },
              { label: 'CONFIRM NEW PASSWORD', key: 'confirmPassword' },
            ].map(field => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm[field.key]}
                  onChangeText={v => setPasswordForm(p => ({ ...p, [field.key]: v }))}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>
            ))}

            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword}>
              <Text style={styles.saveBtnText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  scroll: { flex: 1, padding: 12 },
  logoCard: {
    padding: 20, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 14,
  },
  logo: { width: 64, height: 64, borderRadius: 12 },
  logoTitle: { color: colors.accent, fontSize: 18, fontWeight: '500' },
  logoSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: colors.textSecondary, fontSize: 11, fontWeight: '500',
    letterSpacing: 1, marginBottom: 6, marginTop: 4,
  },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: colors.textSecondary, fontSize: 13 },
  rowValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  rowBtn: { color: colors.accent, fontSize: 13 },
  rowBtnDanger: { color: colors.error, fontSize: 13 },
  toggle: {
    width: 40, height: 22, borderRadius: 11, position: 'relative',
  },
  toggleDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
    position: 'absolute', top: 2,
  },
  btnDanger: {
    borderWidth: 1, borderColor: colors.error, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
    backgroundColor: colors.card,
  },
  btnDangerText: { color: colors.error, fontSize: 15, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%', borderTopWidth: 1, borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '500' },
  formGroup: { marginBottom: 14 },
  formLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '500', letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '500' },
});