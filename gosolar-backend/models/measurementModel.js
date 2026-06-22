const pool = require('../config/db');

const addMeasurement = async (systemId, data) =>{
    const {
        recorded_at,
        voltage_v,
        current_a,
        power_w,
        temperature_c
    } = data;

    const result = await pool.query(
        `INSERT INTO energy_measurements
        (id_system, recorded_at, voltage_v, current_a, power_w, temperature_c)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            systemId,
            recorded_at ?? new Date(),
            voltage_v ?? null,
            current_a ?? null,
            power_w ?? null,
            temperature_c ?? null
        ]
    );
    return result.rows[0];
};

const getHistory = async (systemId, limit = 100 ,offset= 0)=>{
    const result = await pool.query(
        `SELECT * FROM energy_measurements
        WHERE id_system = $1
        ORDER BY recorded_at DESC
        LIMIT $2 OFFSET $3`,
        [systemId, limit, offset]
    );
    return result.rows;
};

const getHistoryByPeriod = async (systemId, startDate, endDate) =>{
    const result = await pool.query(
        `SELECT * FROM energy_measurements
        WHERE id_system = $1
        AND recorded_at >= $2
        AND recorded_at <= $3
        ORDER BY recorded_at ASC`,
        [systemId, startDate, endDate]
    );
    return result.rows;
};

const getLastMeasurement = async (systemId) =>{
    const result = await pool.query(
        `SELECT * FROM energy_measurements
        WHERE  id_system= $1
        AND recorded_at <= NOW()
        ORDER BY recorded_at DESC
        LIMIT 1`,
        [systemId]
    );
    return result.rows[0];
};

const addSummary = async (systemId, data) => {
    const{
        summary_type,
        time_start,
        avg_voltage_v,
        avg_current_a,
        avg_power_w,
        min_temperature_c,
        max_temperature_c,
        avg_temperature_c,
        produced_kwh,
        consumed_kwh
    } = data;

    const result = await pool.query(
        `INSERT INTO energy_measurements_summary
        (id_system, summary_type, time_start, avg_voltage_v, avg_current_a, 
        avg_power_w, min_temperature_c, max_temperature_c, avg_temperature_c, 
        produced_kwh, consumed_kwh)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
            systemId,
            summary_type,
            time_start,
            avg_voltage_v || null,
            avg_current_a || null,
            avg_power_w || null,
            min_temperature_c || null,
            max_temperature_c || null,
            avg_temperature_c || null,
            produced_kwh || 0,
            consumed_kwh || 0
        ]
    );
    return result.rows[0];
};

const updateSummary = async (systemId, summaryType, timeStart, data) =>{
    const {
        avg_voltage_v,
        avg_current_a,
        avg_power_w,
        min_temperature_c,
        max_temperature_c,
        avg_temperature_c,
        produced_kwh,
        consumed_kwh
    } = data;

    const result = await pool.query(
        `UPDATE energy_measurements_summary
        SET avg_voltage_v = $1,
            avg_current_a = $2,
            avg_power_w = $3,
            min_temperature_c = $4,
            max_temperature_c = $5,
            avg_temperature_c =$6,
            produced_kwh = $7,
            consumed_kwh = $8
        WHERE id_system =$9
        AND summary_type = $10
        AND time_start = $11
        RETURNING *`,
        [
            avg_voltage_v || null,
            avg_current_a || null,
            avg_power_w || null,
            min_temperature_c || null,
            max_temperature_c || null,
            avg_temperature_c || null,
            produced_kwh || 0,
            consumed_kwh || 0,
            systemId,
            summaryType,
            timeStart
        ]
    );
    return result.rows[0];
};

const getSummary = async (systemId, summaryType, startDate, endDate) =>{
    const result = await pool.query(
        `SELECT * FROM energy_measurements_summary
        WHERE id_system =$1
        AND summary_type = $2
        AND time_start >= $3
        AND time_start <= $4
        ORDER BY time_start ASC`,

        [systemId, summaryType, startDate, endDate]
    );
    return result.rows;
};

const getLatestSummary = async (systemId, summaryType) =>{
    const result = await pool.query(
        `SELECT * FROM energy_measurements_summary
        WHERE id_system = $1
        AND summary_type = $2
        ORDER BY time_start DESC
        LIMIT 1`,
        [systemId, summaryType]
    );
    return result.rows[0];
};

const getDailyProduction = async (systemId, startDate, endDate) =>{
    const result = await pool.query(
        `SELECT date, produced_kwh, avg_temperature_c FROM (
            SELECT
                DATE(recorded_at AT TIME ZONE 'Europe/Bucharest') AS date,
                ROUND(SUM(COALESCE(power_w, 0)) * 30.0 / 3600000, 4) AS produced_kwh,
                AVG(temperature_c) AS avg_temperature_c
            FROM energy_measurements
            WHERE id_system = $1
            AND DATE(recorded_at AT TIME ZONE 'Europe/Bucharest') >= $2::date
            AND DATE(recorded_at AT TIME ZONE 'Europe/Bucharest') <= $3::date
            GROUP BY DATE(recorded_at AT TIME ZONE 'Europe/Bucharest')
            UNION
            SELECT
                DATE(time_start) AS date,
                produced_kwh,
                avg_temperature_c
            FROM energy_measurements_summary
            WHERE id_system = $1
            AND summary_type = 'daily'
            AND DATE(time_start) >= $2::date
            AND DATE(time_start) <= $3::date
            AND DATE(time_start) < CURRENT_DATE - INTERVAL '30 days'
        ) combined
        ORDER BY date ASC`,
        [systemId, startDate, endDate]
    );
    return result.rows;
};

const getMonthlyProduction = async (systemId, year) =>{
    const result = await pool.query(
        `SELECT month, SUM(produced_kwh) AS produced_kwh FROM (
            SELECT
                DATE_TRUNC('month', recorded_at AT TIME ZONE 'Europe/Bucharest') AS month,
                ROUND(SUM(COALESCE(power_w, 0)) * 30.0 / 3600000, 2) AS produced_kwh
            FROM energy_measurements
            WHERE id_system = $1
            AND EXTRACT(YEAR FROM recorded_at AT TIME ZONE 'Europe/Bucharest') = $2
            GROUP BY DATE_TRUNC('month', recorded_at AT TIME ZONE 'Europe/Bucharest')
            UNION ALL
            SELECT
                DATE_TRUNC('month', time_start) AS month,
                SUM(produced_kwh) AS produced_kwh
            FROM energy_measurements_summary
            WHERE id_system = $1
            AND summary_type = 'daily'
            AND EXTRACT(YEAR FROM time_start) = $2
            AND time_start < CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('month', time_start)
        ) combined
        GROUP BY month
        ORDER BY month ASC`,
        [systemId, year]
    );
    return result.rows;
};

const getEnergyVsConsumption = async (systemId, startDate, endDate) =>{
    const result = await pool.query(
        `SELECT hour, produced_kwh FROM (
            SELECT
                DATE_TRUNC('hour', recorded_at AT TIME ZONE 'Europe/Bucharest') AS hour,
                ROUND(SUM(COALESCE(power_w, 0)) * 30.0 / 3600000, 4) AS produced_kwh
            FROM energy_measurements
            WHERE id_system = $1
            AND DATE(recorded_at AT TIME ZONE 'Europe/Bucharest') >= $2::date
            AND DATE(recorded_at AT TIME ZONE 'Europe/Bucharest') <= $3::date
            GROUP BY DATE_TRUNC('hour', recorded_at AT TIME ZONE 'Europe/Bucharest')
            UNION
            SELECT
                time_start AS hour,
                produced_kwh
            FROM energy_measurements_summary
            WHERE id_system = $1
            AND summary_type = 'daily'
            AND DATE(time_start) >= $2::date
            AND DATE(time_start) <= $3::date
            AND time_start < CURRENT_DATE - INTERVAL '30 days'
        ) combined
        ORDER BY hour ASC`,
        [systemId, startDate, endDate]
    );
    return result.rows;
};

module.exports ={
    addMeasurement,
    getHistory,
    getHistoryByPeriod,
    getLastMeasurement,
    addSummary,
    updateSummary,
    getSummary,
    getLatestSummary,
    getDailyProduction,
    getMonthlyProduction,
    getEnergyVsConsumption
};
