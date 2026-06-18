import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../store/themeStore';
import AppHeader from '../../components/AppHeader';
import { getSystems } from '../../services/systemService';
import { getDailyProduction } from '../../services/measurementService';
import { getWeeklyForecast, fetchForecast } from '../../services/forecastService';

const TARIF_LEI = 0.80;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Insights() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [activeTab, setActiveTab] = useState('forecast');
  const [period, setPeriod] = useState(7);
  const [system, setSystem] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { systems } = await getSystems();
      if (!systems || systems.length === 0) return;

      const activeSystem = systems.find(s => s.system_status === 'active') || systems[0];
      setSystem(activeSystem);

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (period - 1));

      await fetchForecast(activeSystem.id_system).catch(() => {});

      const [forecastRes, historyRes] = await Promise.all([
        getWeeklyForecast(activeSystem.id_system),
        getDailyProduction(
          activeSystem.id_system,
          startDate.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        ),
      ]);

      setForecasts(forecastRes.forecasts || []);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error('Insights error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Calcule history
  const totalKwh = history.reduce((sum, d) => sum + parseFloat(d.produced_kwh || 0), 0);
  const avgKwh = history.length > 0 ? totalKwh / history.length : 0;
  const totalSavings = (totalKwh * TARIF_LEI).toFixed(2);
  const maxKwh = history.length > 0 ? Math.max(...history.map(d => parseFloat(d.produced_kwh || 0))) : 1;

  // Best & Worst day
  const bestDay = history.reduce((best, d) =>
    parseFloat(d.produced_kwh || 0) > parseFloat(best?.produced_kwh || 0) ? d : best, null);
  const worstDay = history.reduce((worst, d) =>
    parseFloat(d.produced_kwh || 0) < parseFloat(worst?.produced_kwh || Infinity) ? d : worst, null);

  // Weather correlation
  const sunnyDays = history.filter(d => parseFloat(d.cloud_coverage || 0) < 30);
  const cloudyDays = history.filter(d => parseFloat(d.cloud_coverage || 0) > 60);
  const avgSunny = sunnyDays.length > 0
    ? sunnyDays.reduce((s, d) => s + parseFloat(d.produced_kwh || 0), 0) / sunnyDays.length
    : 0;
  const avgCloudy = cloudyDays.length > 0
    ? cloudyDays.reduce((s, d) => s + parseFloat(d.produced_kwh || 0), 0) / cloudyDays.length
    : 0;
  const cloudImpact = avgSunny > 0
    ? Math.round(((avgSunny - avgCloudy) / avgSunny) * 100)
    : 0;

  // Forecast helpers
  const getForecastColor = (kwh) => {
    const k = parseFloat(kwh || 0);
    if (k >= 20) return colors.accent;
    if (k >= 10) return '#f5a623';
    return colors.error;
  };

  const getCloudIcon = (cloud) => {
    const c = parseFloat(cloud || 0);
    if (c < 30) return '☀️';
    if (c < 60) return '⛅';
    return '☁️';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  };

  const isToday = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Insights" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Tab selector */}
        <View style={styles.tabRow}>
          {[
            { key: 'forecast', label: 'Forecast' },
            { key: 'history', label: 'History' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'forecast' ? (
          <>
            {/* Forecast cards */}
            <View style={[styles.card, { paddingBottom: 4 }]}>
              <Text style={styles.cardTitle}>{forecasts.length}-DAY SOLAR FORECAST</Text>
              {forecasts.length === 0 ? (
                <Text style={styles.emptyText}>No forecast data. Pull down to refresh.</Text>
              ) : (
                forecasts.map((f, index) => {
                  const kwh = parseFloat(f.predicted_production_kwh || 0);
                  const fColor = getForecastColor(kwh);
                  const today = isToday(f.forecast_date);
                  const maxForecast = Math.max(...forecasts.map(fc => parseFloat(fc.predicted_production_kwh || 0)));
                  const barWidth = maxForecast > 0 ? (kwh / maxForecast) * 100 : 0;

                  return (
                    <View key={index} style={[styles.forecastItem, today && styles.forecastItemToday, index === forecasts.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.forecastLeft}>
                        <Text style={styles.forecastDay}>
                          {today ? 'Today ⭐' : formatDate(f.forecast_date)}
                        </Text>
                        {!today && (
                          <Text style={styles.forecastDate}>
                            {MONTHS[new Date(f.forecast_date).getMonth()]} {new Date(f.forecast_date).getDate()}
                          </Text>
                        )}
                        <View style={styles.forecastCloudRow}>
                          <Text style={styles.forecastCloudIcon}>{getCloudIcon(f.cloud_coverage)}</Text>
                          <Text style={styles.forecastCloud}>{Math.round(f.cloud_coverage || 0)}% clouds</Text>
                        </View>
                      </View>
                      <View style={styles.forecastRight}>
                        <Text style={[styles.forecastKwh, { color: fColor }]}>{kwh.toFixed(1)} kWh</Text>
                        <Text style={styles.forecastTemp}>{Math.round(f.temperature_c || 0)}°C</Text>
                        <View style={styles.forecastBarBg}>
                          <View style={[styles.forecastBar, { width: `${barWidth}%`, backgroundColor: fColor }]} />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          <>
            {/* Period selector */}
            <View style={styles.periodRow}>
              {[7, 14, 30].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p} days</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary */}
            <View style={styles.row}>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>Total</Text>
                <Text style={styles.statValueGreen}>{totalKwh.toFixed(1)} kWh</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>Average</Text>
                <Text style={styles.statValue}>{avgKwh.toFixed(1)} kWh</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statTitle}>Savings</Text>
                <Text style={styles.statValueGreen}>{totalSavings} lei</Text>
              </View>
            </View>

            {/* Best & Worst */}
            <View style={styles.row}>
              <View style={[styles.statCard, { borderColor: colors.accent }]}>
                <Text style={styles.statTitle}>🏆 Best Day</Text>
                <Text style={styles.statValueGreen}>{parseFloat(bestDay?.produced_kwh || 0).toFixed(1)} kWh</Text>
                <Text style={styles.statSubtitle}>{bestDay ? formatDate(bestDay.date) : 'N/A'}</Text>
              </View>
              <View style={[styles.statCard, { borderColor: colors.error }]}>
                <Text style={styles.statTitle}>📉 Worst Day</Text>
                <Text style={[styles.statValue, { color: colors.error }]}>{parseFloat(worstDay?.produced_kwh || 0).toFixed(1)} kWh</Text>
                <Text style={styles.statSubtitle}>{worstDay ? formatDate(worstDay.date) : 'N/A'}</Text>
              </View>
            </View>

            {/* Weather correlation */}
            {cloudImpact > 0 && (
              <View style={styles.correlationCard}>
                <Text style={styles.correlationTitle}>☁️ Weather Impact</Text>
                <Text style={styles.correlationText}>
                  Cloud coverage above 60% reduced production by{' '}
                  <Text style={{ color: colors.error, fontWeight: '500' }}>{cloudImpact}%</Text>
                  {' '}compared to sunny days.
                  {avgSunny > 0 && ` Avg sunny: ${avgSunny.toFixed(1)} kWh vs cloudy: ${avgCloudy.toFixed(1)} kWh.`}
                </Text>
              </View>
            )}

            {/* History list */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>PRODUCTION PER DAY</Text>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No history data for this period.</Text>
              ) : (
                [...history].reverse().map((d, index) => {
                  const kwh = parseFloat(d.produced_kwh || 0);
                  const barW = maxKwh > 0 ? (kwh / maxKwh) * 100 : 0;
                  const barColor = kwh >= avgKwh ? colors.accent : kwh >= avgKwh * 0.5 ? '#f5a623' : colors.error;
                  const savings = (kwh * TARIF_LEI).toFixed(2);

                  return (
                    <View key={index} style={styles.histItem}>
                      <View style={styles.histTop}>
                        <Text style={styles.histDate}>{formatDate(d.date)}</Text>
                        <Text style={[styles.histKwh, { color: barColor }]}>{kwh.toFixed(1)} kWh</Text>
                      </View>
                      <View style={styles.histBarBg}>
                        <View style={[styles.histBar, { width: `${barW}%`, backgroundColor: barColor }]} />
                      </View>
                      <View style={styles.histBottom}>
                        <Text style={styles.histDetail}>{savings} lei saved</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  center: { flex: 1, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.accent, fontSize: 16 },
  scroll: { flex: 1, padding: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: colors.primaryDark },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  cardTitle: {
    color: colors.textSecondary, fontSize: 10, fontWeight: '500',
    letterSpacing: 1, marginBottom: 10,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', padding: 16 },
  forecastItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  forecastItemToday: {
    backgroundColor: colors.primaryDark + '20',
    borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8,
  },
  forecastLeft: { flex: 1 },
  forecastDay: { color: colors.textPrimary, fontSize: 12, fontWeight: '500' },
  forecastDate: { color: colors.textSecondary, fontSize: 10, marginTop: 1 },
  forecastCloudRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  forecastCloudIcon: { fontSize: 12 },
  forecastCloud: { color: colors.textSecondary, fontSize: 10 },
  forecastRight: { alignItems: 'flex-end' },
  forecastKwh: { fontSize: 13, fontWeight: '500' },
  forecastTemp: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  forecastBarBg: { width: 60, height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 4 },
  forecastBar: { height: 4, borderRadius: 2 },
  periodRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  periodBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  periodBtnActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  periodBtnText: { color: colors.textSecondary, fontSize: 11 },
  periodBtnTextActive: { color: colors.accent, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10,
  },
  statTitle: { color: colors.textSecondary, fontSize: 9, marginBottom: 4 },
  statValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  statValueGreen: { color: colors.accent, fontSize: 13, fontWeight: '500' },
  statSubtitle: { color: colors.textSecondary, fontSize: 9, marginTop: 2 },
  correlationCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  correlationTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  correlationText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  histItem: {
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  histTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  histDate: { color: colors.textPrimary, fontSize: 12, fontWeight: '500' },
  histKwh: { fontSize: 13, fontWeight: '500' },
  histBarBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, width: '100%' },
  histBar: { height: 6, borderRadius: 3 },
  histBottom: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  histDetail: { color: colors.textSecondary, fontSize: 10 },
});