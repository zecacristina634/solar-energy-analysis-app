import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../../store/authStore';
import { useTheme } from '../../store/themeStore';
import AppHeader from '../../components/AppHeader';

export default function Profile() {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Profile" />

      <View style={styles.content}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {/* Toggle tema */}
        <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme}>
          {isDark
            ? <Sun size={18} color={colors.accent} />
            : <Moon size={18} color={colors.accent} />
          }
          <Text style={styles.themeBtnText}>
            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={18} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  content: {
    padding: 24,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  email: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 32,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  themeBtnText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    padding: 16,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
});