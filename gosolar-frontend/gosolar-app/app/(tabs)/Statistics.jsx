import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Platform,
  TouchableOpacity, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Download } from 'lucide-react-native';
import { useTheme } from '../../store/themeStore';
import AppHeader from '../../components/AppHeader';
import { getSystems, getDashboardData } from '../../services/systemService';
import { getDailyProduction, getMonthlyProduction, getEnergyVsConsumption } from '../../services/measurementService';
import { getConstantAppliances } from '../../services/applianceService';
import { generateReport } from '../../services/reportService';

const TARIF_LEI = 0.80;
const CO2_FACTOR = 0.4; // kg CO2 per kWh

const screenWidth = Dimensions.get('window').width - 48;

export default function Statistics() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [system, setSystem] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [constantConsumptionW, setConstantConsumptionW] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { systems } = await getSystems();
      if (!systems || systems.length === 0) return;

      const activeSystem = systems.find(s => s.system_status === 'active') || systems[0];
      setSystem(activeSystem);

      const { dashboard } = await getDashboardData(activeSystem.id_system);
      setDashboard(dashboard);

      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      const [dailyRes, monthlyRes, hourlyRes, appliancesRes] = await Promise.all([
        getDailyProduction(
          activeSystem.id_system,
          sevenDaysAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        ),
        getMonthlyProduction(activeSystem.id_system, today.getFullYear()),
        getEnergyVsConsumption(
          activeSystem.id_system,
          today.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        ),
        getConstantAppliances(),
      ]);

      setDailyData(dailyRes.data || []);
      setMonthlyData(monthlyRes.data || []);
      setHourlyData(hourlyRes.data || []);

      const totalW = (appliancesRes.appliances || []).reduce((sum, a) => {
        return sum + parseFloat(a.custom_nominal_power_w || a.catalog_power_w || 0) * (a.quantity || 1);
      }, 0);
      setConstantConsumptionW(totalW);

    } catch (err) {
      console.error('Statistics error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleExportPDF = async () => {
    if (!system) { Alert.alert('Error', 'No system connected'); return; }
    try {
      setExporting(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - 30);
      const startDate = startDateObj.toISOString().split('T')[0];
      const fileName = `gosolar-report-${endDate}.pdf`;

      const blob = await generateReport(system.id_system, startDate, endDate);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const fileUri = FileSystem.cacheDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });

          if (Platform.OS === 'android') {
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1,
              type: 'application/pdf',
            });
          } else {
            await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Open PDF Report' });
          }
        } catch (err) {
          Alert.alert('Error', 'Failed to open PDF. Make sure you have a PDF viewer installed.');
        } finally {
          setExporting(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      Alert.alert('Error', 'Failed to generate report');
      setExporting(false);
    }
  };

  // Calcule
  const todayKwh = parseFloat(dashboard?.produced_today_kwh || 0);
  const weekKwh = dailyData.reduce((sum, d) => sum + parseFloat(d.produced_kwh || 0), 0);
  const monthKwh = monthlyData.reduce((sum, d) => sum + parseFloat(d.produced_kwh || 0), 0);
  const avgDailyKwh = dailyData.length > 0 ? weekKwh / dailyData.length : 0;
  const todaySavings = (todayKwh * TARIF_LEI).toFixed(2);
  const weekSavings = (weekKwh * TARIF_LEI).toFixed(2);
  const monthSavings = (monthKwh * TARIF_LEI).toFixed(2);
  const co2Saved = (monthKwh * CO2_FACTOR).toFixed(1);
  const peakDay = dailyData.length > 0
    ? dailyData.reduce((max, d) => parseFloat(d.produced_kwh) > parseFloat(max.produced_kwh) ? d : max, dailyData[0])
    : null;
  const peakDayLabel = peakDay
    ? `${parseFloat(peakDay.produced_kwh).toFixed(1)} kWh — ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(peakDay.date).getDay()]}`
    : '0.0 kWh';

  const currentPowerW = parseFloat(dashboard?.current_power_w || 0);
  const peakW = parseFloat(system?.peak_power_kwp || 5) * 1000;
  const performanceRatio = peakW > 0 ? Math.min(100, Math.round((currentPowerW / peakW) * 100)) : 0;
  const performanceLabel = performanceRatio >= 70 ? 'Good' : performanceRatio >= 40 ? 'Fair' : 'Low';
  const performanceColor = performanceRatio >= 70 ? colors.accent : performanceRatio >= 40 ? '#f5a623' : colors.error;

  // Date grafic zilnic
  const dailyChartData = {
    labels: dailyData.length > 0
      ? dailyData.map(d => {
          const date = new Date(d.date);
          return ['Su','Mo','Tu','We','Th','Fr','Sa'][date.getDay()];
        })
      : ['Mo','Tu','We','Th','Fr','Sa','Su'],
    datasets: [{
      data: dailyData.length > 0
        ? dailyData.map(d => parseFloat(parseFloat(d.produced_kwh || 0).toFixed(1)))
        : [0, 0, 0, 0, 0, 0, 0]
    }]
  };

  // Date grafic lunar
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyChartData = {
    labels: monthlyData.length > 0
      ? monthlyData.slice(-6).map(d => months[new Date(d.month).getMonth()])
      : months.slice(0, 6),
    datasets: [{
      data: monthlyData.length > 0
        ? monthlyData.slice(-6).map(d => parseFloat(parseFloat(d.produced_kwh || 0).toFixed(0)))
        : [0, 0, 0, 0, 0, 0]
    }]
  };

  // Date grafic prod vs consum
  const TARGET_HOURS = [6, 8, 10, 12, 14, 16, 18];
  const hourlyLabels = ['6h', '8h', '10h', '12h', '14h', '16h', '18h'];
  const productionLine = TARGET_HOURS.map(h => {
    const match = hourlyData.find(d => new Date(d.hour).getHours() === h);
    return parseFloat(parseFloat(match?.produced_kwh || 0).toFixed(2));
  });
  const consumptionLine = hourlyLabels.map(() =>
    parseFloat((constantConsumptionW / 1000).toFixed(2))
  );

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 1,
    color: (opacity = 1) => isDark
      ? `rgba(126, 217, 87, ${opacity})`
      : `rgba(10, 22, 40, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 8 },
    propsForDots: { r: '3', strokeWidth: '1', stroke: colors.accent },
    propsForBackgroundLines: { strokeDasharray: '3 2', stroke: colors.border },
    paddingRight: 40,
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
      <AppHeader title="Statistics" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Summary row 1 */}
        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Today</Text>
            <Text style={styles.statValueGreen}>{todayKwh.toFixed(1)} kWh</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>This Week</Text>
            <Text style={styles.statValueGreen}>{weekKwh.toFixed(1)} kWh</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>This Month</Text>
            <Text style={styles.statValueGreen}>{(monthKwh / 1000).toFixed(2)} MWh</Text>
          </View>
        </View>

        {/* Summary row 2 */}
        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Avg Daily</Text>
            <Text style={styles.statValue}>{avgDailyKwh.toFixed(1)} kWh</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Performance</Text>
            <View style={styles.perfRow}>
              <Text style={[styles.statValueGreen, { color: performanceColor }]}>{performanceRatio}%</Text>
              <View style={[styles.perfBadge, { backgroundColor: performanceColor + '20' }]}>
                <Text style={[styles.perfBadgeText, { color: performanceColor }]}>{performanceLabel}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Savings</Text>
            <Text style={styles.statValueGreen}>{weekSavings} lei</Text>
          </View>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {[
            { key: 'daily', label: 'Daily' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'vs', label: 'Prod vs Use' },
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

        {/* Grafic */}
        <View style={styles.card}>
          {activeTab === 'daily' && (
            <>
              <Text style={styles.cardTitle}>DAILY PRODUCTION — LAST 7 DAYS</Text>
              <BarChart
                data={dailyChartData}
                width={screenWidth}
                height={160}
                chartConfig={chartConfig}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                yAxisSuffix=" kWh"
              />
            </>
          )}

          {activeTab === 'monthly' && (
            <>
              <Text style={styles.cardTitle}>MONTHLY PRODUCTION — THIS YEAR</Text>
              <BarChart
                data={monthlyChartData}
                width={screenWidth}
                height={185}
                chartConfig={chartConfig}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                yAxisSuffix=" kWh"
              />
            </>
          )}

          {activeTab === 'vs' && (
            <>
              <Text style={styles.cardTitle}>PRODUCTION VS CONSUMPTION — TODAY</Text>
              <LineChart
                data={{
                  labels: hourlyLabels,
                  datasets: [
                    { data: productionLine, color: () => colors.textPrimary, strokeWidth: 2 },
                    { data: consumptionLine, color: () => colors.accent, strokeWidth: 2 },
                  ],
                  legend: ['Production', 'Consumption']
                }}
                width={screenWidth}
                height={160}
                chartConfig={chartConfig}
                style={styles.chart}
                bezier
              />
            </>
          )}
        </View>

        {/* Savings breakdown */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>SAVINGS BREAKDOWN</Text>
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>Today</Text>
            <Text style={styles.savingsValue}>{todaySavings} lei</Text>
          </View>
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>This week</Text>
            <Text style={styles.savingsValue}>{weekSavings} lei</Text>
          </View>
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>This month</Text>
            <Text style={styles.savingsValue}>{monthSavings} lei</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>CO₂ saved this month</Text>
            <Text style={styles.savingsValueDark}>{co2Saved} kg</Text>
          </View>
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>Peak production (7 days)</Text>
            <Text style={styles.savingsValueDark}>{peakDayLabel}</Text>
          </View>
        </View>

        {/* Export PDF */}
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF} disabled={exporting}>
          <Download size={16} color={colors.primaryDark} />
          <Text style={styles.exportBtnText}>
            {exporting ? 'Generating...' : 'Export PDF Report — last 30 days'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  center: { flex: 1, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.accent, fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, flexGrow: 1 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10,
  },
  statTitle: { color: colors.textSecondary, fontSize: 9, marginBottom: 4 },
  statValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  statValueGreen: { color: colors.accent, fontSize: 13, fontWeight: '500' },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  perfBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10 },
  perfBadgeText: { fontSize: 8, fontWeight: '500' },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 10, marginTop: 4 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: colors.primaryDark },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  cardTitle: {
    color: colors.textSecondary, fontSize: 10, fontWeight: '500',
    letterSpacing: 1, marginBottom: 10,
  },
  chart: { borderRadius: 8, marginLeft: -12, paddingBottom: 6 },
  savingsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8,
  },
  savingsLabel: { color: colors.textSecondary, fontSize: 13 },
  savingsValue: { color: colors.accent, fontSize: 14, fontWeight: '500' },
  savingsValueDark: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  divider: { height: 0.5, backgroundColor: colors.border, marginVertical: 4 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, paddingVertical: 14,
    borderRadius: 12, marginBottom: 10,
  },
  exportBtnText: { color: colors.primaryDark, fontSize: 14, fontWeight: '500' },
});