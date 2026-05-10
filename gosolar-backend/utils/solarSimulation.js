const SOLAR_CONSTANT = 1362; 
const PANEL_EFFICIENCY = 0.17;
const PERFORMANCE_RATIO = 0.80;
const TEMP_COEFFICIENT = -0.004;
const TEMP_REFERENCE = 25;
const DEFAULT_LATITUDE = 44.43; //Bucuresti

const toRad = (deg) => (deg * Math.PI) / 180; //grade in radiani
const toDeg = (rad) => (rad * 180) / Math.PI; //radiani in grade

// declinatia solara pentru ziua n din an
// δ = 23.45 × sin(360/365 × (284 + n))
const getSolarDeclination = (dayOfYear) =>{
    return 23.45 * Math.sin(toRad((360/365) *  (284 + dayOfYear)));
};

const getDayOfYear = (date) =>{
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date-start;
    const oneDay = 1000 * 60 * 60 * 24; // milisecunde
    return Math.floor(diff/oneDay);
};

// unghiul orar
// ω = 15 × (h - 12)
const getHourAngle = (date) =>{
    const hours = date.getHours() + date.getMinutes() /60;
    return 15 * (hours - 12);
};

// unghiul zenital
// cos(θz) = sin(φ)×sin(δ) + cos(φ)×cos(δ)×cos(ω)
const getZenithAngle = (latitude, declination, hourAngle) =>{
    const phi = toRad(latitude);
    const delta = toRad(declination);
    const omega = toRad(hourAngle);

    const cosTheta = Math.sin(phi) * Math.sin(delta) +
        Math.cos(phi) * Math.cos(delta) * Math.cos(omega);

    return Math.acos(Math.max(-1, Math.min(1, cosTheta)));
};

// ora rasaritului si apusului in ore
// cos(ω_sunset) = -tan(φ) × tan(δ)
const getSunriseSunset = (latitude, declination) => {
    const phi = toRad(latitude);
    const delta = toRad(declination);

    const cosOmega = -Math.tan(phi) * Math.tan(delta);

    if(cosOmega > 1) return { sunrise: 12, sunset: 12}; //noapte polara
    if(cosOmega < -1) return { sunrise: 0, sunset: 24}; // zi polara

    const omegaSunset = toDeg(Math.acos(cosOmega));
    const sunrise = 12 - omegaSunset/15;
    const sunset = 12 + omegaSunset/15;

    return {sunrise, sunset};
};

// iradierea extraterestra IETI
// IETI = I0 × (1 + 0.033×cos(2π×dn/365)) × cos(θz)
const getExtraterrestrialIrradiance = (dayOfYear, zenithAngle) =>{
    const eccentricity = 1 + 0.033 * Math.cos(toRad((2 * Math.PI * dayOfYear) / 365));
    const cosZenith = Math.cos(zenithAngle);
    return Math.max(0, SOLAR_CONSTANT * eccentricity * cosZenith);
};

// simple sky
// I_simple = Smax × sin(π×(t - t_rise) / (t_set - t_rise))
const getSimpleSkyIrradiance = (t, tRise, tSet, Smax) =>{
    if(t <= tRise || t >= tSet) return 0;
    return Smax * Math.sin((Math.PI * (t - tRise)) / (tSet - tRise));
};

// cloudy sky + variabilitate meteo
// I_cloudy = Smax × sin(...) × (1 - a1×|sin(b1×...)|^c1) - a2×|sin(b2×...)|^c2
const getClouldySkyIrradiance = (t, tRise, tSet, Smax, cloudCoverage) => {
    if (t <= tRise || t >= tSet) return 0;
    
    const cloud = cloudCoverage/100;

    const a1 = 0.3 * cloud;
    const a2 = 0.2 * cloud;
    const b1 = 2.5;
    const b2 = 1.5;
    const c1 = 0.5;
    const c2 = 0.5;

    const normalizedTime = (Math.PI * (t - tRise)) / (tSet - tRise);

    const baseTerm = Smax * Math.sin(normalizedTime);
    const variation1 = a1 * Math.pow(Math.abs(Math.sin(b1 * normalizedTime)), c1);
    const variation2 = a2 * Math.pow(Math.abs(Math.sin(b2 * normalizedTime)), c2);

    return Math.max(0, baseTerm * (1-variation1) - variation2 * Smax);
};

const simulateMeasurement = (date, system, weatherData = {}) => {
    const latitude = system.latitude || DEFAULT_LATITUDE;
    const peakPowerKwp = system.peak_power_kwp || 5;
    const tiltAngle = system.tilt_angle_deg || 30;
    const cloudCoverage = weatherData.cloud_coverage || 0;
    const ambientTemp = weatherData.temperature_c || 20;

    const dayOfYear = getDayOfYear(date);
    const declination = getSolarDeclination(dayOfYear);
    const hourAngle = getHourAngle(date);
    const zenithAngle = getZenithAngle(latitude, declination, hourAngle);
    const {sunrise, sunset} = getSunriseSunset(latitude, declination);
    const currentHour = date.getHours() + date.getMinutes() /60;

    const zenithNoon = getZenithAngle(latitude, declination, 0);
    const IetiMax = getExtraterrestrialIrradiance(dayOfYear, zenithNoon);

    const M = 1-cloudCoverage /100 *0.8; // cloudiness factor
    const Smax = IetiMax * M;

    const irradiance = getClouldySkyIrradiance(currentHour, sunrise, sunset, Smax, cloudCoverage);
    
    // corectie pentru unghiul panoului
    const tiltFactor = Math.cos(toRad(Math.abs(tiltAngle - toDeg(zenithAngle)*0.5)));
    const adjustedIrradiance = irradiance * Math.max(0.7, Math.min(1.15, tiltFactor));

    const panelTemp = ambientTemp + (irradiance/1000)*25;
    const tempFactor = 1 + TEMP_COEFFICIENT * (panelTemp - TEMP_REFERENCE);
    
    // puterea produsa
    // P = G × A × η × PR × temp_factor
    // A = peak_power_kwp × 1000 / (SOLAR_CONSTANT × η) = aprox suprafata panourilor
    const panelArea = (peakPowerKwp * 1000) / (1000 * PANEL_EFFICIENCY);
    const power_w = Math.max(0, adjustedIrradiance * panelArea * PANEL_EFFICIENCY * PERFORMANCE_RATIO * tempFactor);

    // tensiunea si curentul 
    const voltage_v =irradiance> 50 ? parseFloat((48 * (1-0.003 * (panelTemp - TEMP_REFERENCE)) * Math.min(1, irradiance/800)).toFixed(3)) : 0;
    const current_a = voltage_v > 1 ? parseFloat((power_w / voltage_v).toFixed(3)) : 0;

    return {
        recorded_at: date,
        voltage_v: parseFloat(voltage_v.toFixed(3)),
        current_a: parseFloat(current_a.toFixed(3)),
        power_w: parseFloat(power_w.toFixed(2)),
        temperature_c: parseFloat(panelTemp.toFixed(2))
    };
};

const simulateFullDay = (date, system, weatherData= {}, intervalMinutes = 30) =>{
    const measurements = [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const totalIntervals = (24 * 60)/intervalMinutes;
    for (let i = 0; i<totalIntervals; i++){
        const measurementTime = new Date(startOfDay);
        measurementTime.setMinutes(i * intervalMinutes);

        const measurement = simulateMeasurement(measurementTime, system, weatherData);
        measurements.push(measurement);
    }

    return measurements;
};

module.exports = {
    simulateMeasurement,
    simulateFullDay
};