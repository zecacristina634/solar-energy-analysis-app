import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../store/authStore';
import { colors } from '../constants/colors';

function NavigationGuard() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

    useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!token && !inAuthGroup) {
        router.replace('/auth/Login');
    } else if (token && inAuthGroup) {
        router.replace('/(tabs)/Dashboard');
    } else if (token && !inAuthGroup && !inTabsGroup) {
        router.replace('/(tabs)/Dashboard');
    }
    }, [token, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryDark }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}