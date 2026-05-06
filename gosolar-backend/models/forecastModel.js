const pool = require('../config/db');

const upsert = async (systemId, data) =>{
    const {
        forecast_date,
        temperature_c,
        solar_irradiance,
        cloud_coverage,
        predicted_production_kwh
    } = data;

    const  result = await pool.query(
        `INSERT INTO forecast
        (id_system, forecast_date, temperature_c, solar_irradiance, 
        cloud_coverage, predicted_production_kwh)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id_system, forecast_date)
        DO UPDATE SET
            temperature_c = EXCLUDED.temperature_c,
            solar_irradiance = EXCLUDED.solar_irradiance,
            cloud_coverage = EXCLUDED.cloud_coverage,
            predicted_production_kwh = EXCLUDED.predicted_production_kwh
        RETURNING *`,
        [
            systemId,
            forecast_date,
            temperature_c ?? null,
            solar_irradiance ?? null,
            cloud_coverage ?? null,
             predicted_production_kwh ?? null
        ]
    );
    return result.rows[0];
};

const getBySystem = async (systemId) =>{
    const result = await pool.query(
        `SELECT * FROM forecast
        WHERE id_system = $1
        ORDER BY forecast_date ASC`,
        [systemId]
    );
    return result.rows;
};

const getByDate = async (systemId, date) =>{
    const result = await pool.query(
        `SELECT * FROM forecast
        WHERE id_system = $1
        AND forecast_date = $2`,
        [systemId, date]
    );
    return result.rows[0];
};

const getWeeklyForecast = async (systemId) =>{
    const result = await pool.query(
        `SELECT * FROM forecast
        WHERE id_system = $1
        AND forecast_date >= CURRENT_DATE
        AND forecast_date < CURRENT_DATE + INTERVAL '7 days'
        ORDER BY forecast_date ASC`,
        [systemId]
    );
    return result.rows;
};

const deleteOld = async (systemId) =>{
    const result = await pool.query(
        `DELETE FROM forecast
        WHERE id_system = $1
        AND forecast_date < CURRENT_DATE
        RETURNING id_forecast`,
        [systemId]
    );
    return result.rowCount;
};

module.exports ={
    upsert,
    getBySystem,
    getByDate,
    getWeeklyForecast,
    deleteOld
};
