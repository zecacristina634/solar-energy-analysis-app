import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../store/themeStore';

export default function AppHeader({ title, right, hideLogo = false }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.primary, borderBottomColor: colors.borderLight }]}>
      <View style={styles.left}>
        {!hideLogo && (
          <Image
            source={require('../assets/images/logo-gosolar1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
  },
});
