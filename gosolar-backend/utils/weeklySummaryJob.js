const cron = require('node-cron');
const pool = require('../config/db');
const measurementModel = require('../models/measurementModel');

const aggregateDayForSystem = async (systemId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const result = await pool.query(
        `SELECT
            ROUND(SUM(COALESCE(power_w, 0)) * 30.0 / 3600000, 4) AS produced_kwh,
            AVG(voltage_v) AS avg_voltage_v,
            AVG(current_a) AS avg_current_a,
            AVG(power_w)   AS avg_power_w,
            MIN(temperature_c) AS min_temperature_c,
            MAX(temperature_c) AS max_temperature_c,
            AVG(temperature_c) AS avg_temperature_c,
            COUNT(*) AS measurement_count
        FROM energy_measurements
        WHERE id_system = $1
        AND recorded_at >= $2::date
        AND recorded_at <  $3::date`,
        [systemId, dateStr, nextDayStr]
    );

    const row = result.rows[0];
    if (!row || parseInt(row.measurement_count) === 0) return;

    const existing = await pool.query(
        `SELECT id FROM energy_measurements_summary
         WHERE id_system = $1 AND summary_type = 'daily' AND time_start = $2::date`,
        [systemId, dateStr]
    );

    const summaryData = {
        summary_type: 'daily',
        time_start: dateStr,
        avg_voltage_v: row.avg_voltage_v,
        avg_current_a: row.avg_current_a,
        avg_power_w: row.avg_power_w,
        min_temperature_c: row.min_temperature_c,
        max_temperature_c: row.max_temperature_c,
        avg_temperature_c: row.avg_temperature_c,
        produced_kwh: row.produced_kwh,
        consumed_kwh: 0,
    };

    if (existing.rows.length > 0) {
        await measurementModel.updateSummary(systemId, 'daily', dateStr, summaryData);
    } else {
        await measurementModel.addSummary(systemId, summaryData);
    }
};

const runWeeklySummary = async () => {
    console.log('[WEEKLY SUMMARY] Starting weekly aggregation...');
    try {
        const systemsResult = await pool.query(
            `SELECT id_system FROM photovoltaic_system WHERE system_status = 'active'`
        );

        for (const { id_system } of systemsResult.rows) {
            for (let i = 1; i <= 7; i++) {
                const day = new Date();
                day.setDate(day.getDate() - i);
                await aggregateDayForSystem(id_system, day);
            }

            await pool.query(
                `DELETE FROM energy_measurements
                 WHERE id_system = $1
                 AND recorded_at < NOW() - INTERVAL '30 days'`,
                [id_system]
            );

            console.log(`[WEEKLY SUMMARY] System ${id_system} — aggregated 7 days, cleaned old measurements`);
        }

        console.log('[WEEKLY SUMMARY] Done.');
    } catch (err) {
        console.error('[WEEKLY SUMMARY] Error:', err.message);
    }
};

const scheduleWeeklySummary = () => {
    cron.schedule('0 0 * * 0', runWeeklySummary, {
        timezone: 'Europe/Bucharest'
    });
    console.log('[WEEKLY SUMMARY] Scheduled for every Sunday at midnight');
};

module.exports = { scheduleWeeklySummary, runWeeklySummary };
