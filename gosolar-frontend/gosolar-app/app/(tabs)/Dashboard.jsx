import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Rect, Polygon, Text as SvgText, Animate } from 'react-native-svg';
import { Zap, Wifi, Play, Square, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../store/authStore';
import { colors } from '../../constants/colors';
import { getSystems, getDashboardData, pairSystem, startSimulation, runSimulation, stopSimulation } from '../../services/systemService';
import { getConstantAppliances } from '../../services/applianceService';
import PairingModal from '../../components/PairingModal';

const TARIF_LEI = 0.80;

export default function Dashboard() {
  const {user} = useAuth();

  const [system, setSystem] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [constantConsumptionW, setConstantConsumptionW] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pairingModalVisible, setPairingModalVisible] = useState(false);

  const loadData = useCallback(async ()=>{
    try{
      const {systems} = await getSystems();
      if(!systems || systems.length === 0){
        setSystem(null);
        setDashboard(null);
        setLoading(false);
        return;
      }

      const activeSystem = systems.find(s => s.system_status === 'active') || systems[0];
      setSystem(activeSystem);
      setSimRunning(activeSystem.system_type === 'simulated' && activeSystem.system_status === 'active');

      const {dashboard} = await getDashboardData(activeSystem.id_system);
      setDashboard(dashboard);
      setLastUpdated(new Date());

      const {appliances } = await getConstantAppliances();
      const totalW = appliances.reduce((sum, a)=>{
        const power = parseFloat(a.custom_nominal_power_w || a.catalog_power_w || 0);
        const qty = a.quantity || 1;
        return sum + power * qty;
      }, 0);
      setConstantConsumptionW(totalW);
    } catch (err){
      console.error('Dashboard load error:', err.message);
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  },[]);

  useEffect(()=>{
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = ()=>{
    setRefreshing(true);
    loadData();
  };

  const handlePair = () => {
    setPairingModalVisible(true);
  };

  const handlePairConfirm = async (code) => {
    try {
      await pairSystem(code);
      
      const { systems } = await getSystems();
      const newSystem = systems.find(s => s.system_status === 'active') || systems[0];
      
      if (newSystem && newSystem.system_type === 'simulated') {
        await runSimulation(newSystem.id_system, {});
        setSimRunning(true);
        Alert.alert('Success', 'Device connected and simulation started!');
      } else {
        Alert.alert('Success', 'Device connected successfully!');
      }
      
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid pairing code');
    }
  };

  const handleSimulation = async ()=>{
    try{
      if(simRunning){
        await stopSimulation(system.id_system);
        setSimRunning(false);
        Alert.alert('Simulation stopped');
      }else if(system && system.system_type === 'simulated'){
        await runSimulation(system.id_system, {});
        setSimRunning(true);
        Alert.alert('Simulation running');
      } else{
        const result = await startSimulation({
          system_name: 'Simulated System',
          peak_power_kwp: 5,
          latitude: 44.43,
          longitude: 26.10
        });
        Alert.alert('Success', `Pairing code: ${result.pairing_code}\nEnter the code to connect.`);
        loadData();
      }
    } catch(err){
      Alert.alert('Error', err.response?.data.message || 'Simulation error');
    }
  };

  const currentPowerW = parseFloat(dashboard?.current_power_w || 0);
  const producedTodayKwh = parseFloat(dashboard?.produced_today_kwh || 0);
  const tempC = parseFloat(dashboard?.current_temperature_c || 0);
  const surplusW = currentPowerW - constantConsumptionW;
  const toGridW = Math.max(0, surplusW);
  const fromGridW = Math.max(0, -surplusW);
  const savingsLei = (producedTodayKwh * TARIF_LEI).toFixed(2);
  const peakW = parseFloat(system?.peak_power_kwp || 5) * 1000;
  const arcPercent = Math.min(1, currentPowerW / peakW);

  const arcRadius = 55;
  const arcCircumference = Math.PI * arcRadius;
  const arcFill = arcPercent * arcCircumference;

  const getLastUpdatedText = ()=>{
    if (!lastUpdated) return 'Never';
    const diff = Math.floor((new Date() - lastUpdated)/1000);
    if(diff <60) return `${diff}s ago`;
    if(diff <3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  };

  if(loading){
    return(
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return(
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: system?.system_status === 'active' ? colors.accent : colors.error }]} />
          <Text style={styles.statusText}>{system?.system_status || 'No system'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Butoane */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.btnPrimary} onPress={handlePair}>
            <Wifi size={14} color={colors.primaryDark} />
            <Text style={styles.btnPrimaryText}>Connect Device</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, simRunning && styles.btnStop]}
            onPress={handleSimulation}
          >
            {simRunning
              ? <><Square size={14} color={colors.error} /><Text style={[styles.btnOutlineText, { color: colors.error }]}>Stop Sim</Text></>
              : <><Play size={14} color={colors.accent} /><Text style={styles.btnOutlineText}>Simulation</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Energy Flow */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ENERGY FLOW</Text>
          <Svg width="100%" height={90} viewBox="0 0 300 90">
            {/* Panou solar */}
            <Rect x="4" y="18" width="40" height="26" fill="#0a1628" stroke="#7ed957" strokeWidth="1.5" rx="3"/>
            <Line x1="16" y1="18" x2="16" y2="44" stroke="#7ed957" strokeWidth="0.8" opacity="0.5"/>
            <Line x1="28" y1="18" x2="28" y2="44" stroke="#7ed957" strokeWidth="0.8" opacity="0.5"/>
            <Line x1="4" y1="31" x2="44" y2="31" stroke="#7ed957" strokeWidth="0.8" opacity="0.5"/>
            <Circle cx="24" cy="9" r="7" fill="#7ed957" opacity="0.9"/>
            <SvgText x="24" y="58" textAnchor="middle" fill="#7ed957" fontSize="9">{Math.round(currentPowerW)}W</SvgText>

            {/* Flow panou -> invertor */}
            <Line x1="44" y1="31" x2="96" y2="31" stroke="#7ed957" strokeWidth="2" strokeDasharray="6 4"/>

            {/* Invertor */}
            <Rect x="96" y="22" width="30" height="18" fill="#0a1628" stroke="#1a3050" strokeWidth="1" rx="2"/>
            <SvgText x="111" y="33" textAnchor="middle" fill="#6b8ab0" fontSize="8">INV</SvgText>
            <SvgText x="111" y="58" textAnchor="middle" fill="#6b8ab0" fontSize="9">Invertor</SvgText>

            {/* Flow invertor -> casa */}
            <Line x1="126" y1="31" x2="178" y2="31" stroke="#7ed957" strokeWidth="2" strokeDasharray="6 4"/>

            {/* Casa */}
            <Polygon points="178,22 200,31 222,22" fill="#0a1628" stroke="#1a3050" strokeWidth="1.5"/>
            <Rect x="180" y="31" width="40" height="16" fill="#0f1f35" stroke="#1a3050" strokeWidth="1"/>
            <Rect x="185" y="35" width="8" height="12" fill="#0a1628" stroke="#1a3050" strokeWidth="0.5"/>
            <Rect x="199" y="35" width="8" height="10" fill="#050d1a" stroke="#1a3050" strokeWidth="0.5"/>
            <Rect x="183" y="24" width="7" height="4" fill="#0f1f35" stroke="#7ed957" strokeWidth="0.8"/>
            <Rect x="193" y="24" width="7" height="4" fill="#0f1f35" stroke="#7ed957" strokeWidth="0.8"/>
            <SvgText x="200" y="58" textAnchor="middle" fill="#6b8ab0" fontSize="9">{Math.round(constantConsumptionW)}W</SvgText>

            {/* Flow casa -> retea */}
            <Line x1="222" y1="31" x2="268" y2="31" stroke={toGridW > 0 ? "#7ed957" : "#e74c3c"} strokeWidth="2" strokeDasharray="6 4" opacity="0.7"/>

            {/* Retea */}
            <Circle cx="280" cy="31" r="12" fill="#0a1628" stroke={toGridW > 0 ? "#7ed957" : "#1a3050"} strokeWidth="1.5"/>
            <SvgText x="280" y="35" textAnchor="middle" fill={toGridW > 0 ? "#7ed957" : "#6b8ab0"} fontSize="9">⚡</SvgText>
            <SvgText x="280" y="58" textAnchor="middle" fill={toGridW > 0 ? "#7ed957" : "#e74c3c"} fontSize="9">
              {toGridW > 0 ? `+${Math.round(toGridW)}W` : `-${Math.round(fromGridW)}W`}
            </SvgText>
          </Svg>
        </View>

        {/* Arc progres */}
        <View style={[styles.card, styles.arcCard]}>
          <Svg width={250} height={160} viewBox="0 0 200 130" style={styles.arcSvg}>
            <Path d="M 20 115 A 80 80 0 0 1 180 115" fill="none" stroke="#1a3050" strokeWidth="12" strokeLinecap="round"/>
            <Path
              d="M 20 115 A 80 80 0 0 1 180 115"
              fill="none"
              stroke="#7ed957"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${arcFill * 2.51} 251`}
            />
            
            <View style={styles.arcTextOverlay}>
              <Text style={styles.arcValue}>{Math.round(currentPowerW)}</Text>
              <Text style={styles.arcUnit}>W current</Text>
            </View>
            <SvgText x="13" y="130" textAnchor="start" fill="#6b8ab0" fontSize="9">0W</SvgText>
            <SvgText x="173" y="130" textAnchor="start" fill="#6b8ab0" fontSize="9">{peakW/1000}kW</SvgText>
          </Svg>
        </View>

        {/* Stats row */}
        <View style={styles.row}>
          <View style={styles.mini}>
            <Text style={styles.miniTitle}>Today</Text>
            <Text style={styles.miniValueGreen}>{producedTodayKwh.toFixed(2)} kWh</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniTitle}>Savings</Text>
            <Text style={styles.miniValueGreen}>{savingsLei} lei</Text>
          </View>
          <View style={styles.mini}>
            <Text style={styles.miniTitle}>Panel Temp</Text>
            <Text style={styles.miniValue}>{tempC.toFixed(1)}°C</Text>
          </View>
        </View>

        {/* Surplus + Last updated */}
        <View style={styles.row}>
          <View style={[styles.surplusCard, { borderColor: surplusW >= 0 ? colors.accent : colors.error }]}>
            <Zap size={14} color={surplusW >= 0 ? colors.accent : colors.error} />
            <Text style={[styles.surplusText, { color: surplusW >= 0 ? colors.accent : colors.error }]}>
              {surplusW >= 0 ? `Surplus: +${Math.round(surplusW)}W` : `Deficit: ${Math.round(surplusW)}W`}
            </Text>
          </View>
          <View style={styles.updatedCard}>
            <RefreshCw size={12} color={colors.textSecondary} />
            <Text style={styles.updatedText}>Updated {getLastUpdatedText()}</Text>
          </View>
        </View>

      </ScrollView>

      <PairingModal
        visible={pairingModalVisible}
        onClose={() => setPairingModalVisible(false)}
        onConfirm={handlePairConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  center: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.accent,
    fontSize: 16,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnPrimaryText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '500',
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnStop: {
    borderColor: colors.error,
  },
  btnOutlineText: {
    color: colors.accent,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    width: '100%',
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 8,
  },
  arcCard: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
    position: 'relative',
  },
  arcTextOverlay: {
    position: 'absolute',
    alignItems: 'center',
    top: 75,
    left: 0,
    right: 0,
  },
  arcValue: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '500',
  },
  arcUnit: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  arcSvg: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mini: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
  },
  miniTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    marginBottom: 4,
  },
  miniValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  miniValueGreen: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  surplusCard: {
    flex: 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  surplusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  updatedCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updatedText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
});
