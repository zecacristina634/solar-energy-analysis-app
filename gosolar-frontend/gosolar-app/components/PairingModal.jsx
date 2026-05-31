import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../constants/colors';

export default function PairingModal({ visible, onClose, onConfirm }) {
  const [code, setCode] = useState('');

  const handleConfirm = () => {
    if (!code.trim()) return;
    onConfirm(code.trim().toUpperCase());
    setCode('');
    onClose();
  };

  const handleClose = () => {
    setCode('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>

          <View style={styles.header}>
            <Text style={styles.title}>Connect Device</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Enter the pairing code shown on your device screen
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. ABC123"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            autoFocus
          />

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirm, !code.trim() && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={!code.trim()}
            >
              <Text style={styles.btnConfirmText}>Connect</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  btnCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  btnConfirm: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnConfirmText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '500',
  },
});