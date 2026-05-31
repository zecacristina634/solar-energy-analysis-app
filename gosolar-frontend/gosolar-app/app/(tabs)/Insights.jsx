import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export default function Insights() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Insights</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '500',
  },
});