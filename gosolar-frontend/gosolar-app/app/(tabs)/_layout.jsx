import { Tabs } from 'expo-router';
import { Home, BarChart2, Lightbulb, Zap, Bell, User } from 'lucide-react-native';
import { useTheme } from '../../store/themeStore';

export default function TabsLayout() {
  const {colors}= useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarIcon: ({ color }) => {
          const icons = {
            Dashboard: Home,
            Statistics: BarChart2,
            Insights: Lightbulb,
            ShiftableLoads: Zap,
            Recommendations: Bell,
            Profile: User,
          };
          const Icon = icons[route.name];
          return Icon ? <Icon size={22} color={color} /> : null;
        },
      })}
    >
      <Tabs.Screen name="Dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="Statistics" options={{ title: 'Statistics' }} />
      <Tabs.Screen name="Insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="ShiftableLoads" options={{ title: 'Loads' }} />
      <Tabs.Screen name="Recommendations" options={{ title: 'Recs' }} />
      <Tabs.Screen name="Profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}