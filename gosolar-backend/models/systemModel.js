const pool = require ('../config/db');

const getById = async (id, userId) =>{
    const result = await pool.query(
        `SELECT * FROM photovoltaic_system
        WHERE id_system = $1 AND id_user = $2`,
        [id, userId]
    );
    return result.rows[0]
};

const getByUser = async (userId) =>{
    const result = await pool.query(
        `SELECT * FROM photovoltaic_system
        WHERE id_user = $1
        ORDER BY installation_date DESC`,
        [userId]
    );
    return result.rows;
};

const getByIdOnly = async (id) =>{
    const result = await pool.query(
        `SELECT * FROM photovoltaic_system
        WHERE id_system = $1`,
        [id]
    );
    return result.rows[0];
};

const create = async (userId, data) =>{
    const{
        system_name,
        peak_power_kwp,
        panel_orientation,
        tilt_angle_deg,
        system_type,
        installation_date
    } = data;

    const result = await pool.query(
        `INSERT INTO photovoltaic_system
        (id_user, system_name, peak_power_kwp, panel_orientation,
        tilt_angle_deg, system_type, installation_date, system_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        RETURNING *`,
        [
            userId,
            system_name || null,
            peak_power_kwp || null,
            panel_orientation || null,
            tilt_angle_deg || null,
            system_type,
            installation_date || null
        ]
    );
    return result.rows[0];
};

const update = async (id, userId, data) =>{
    const{
        system_name,
        peak_power_kwp,
        panel_orientation,
        tilt_angle_deg,
        installation_date
    } = data;

    const result = await pool.query(
        `UPDATE photovoltaic_system
        SET system_name = $1,
            peak_power_kwp = $2,
            panel_orientation = $3,
            tilt_angle_deg = $4,
            installation_date = $5
        WHERE id_system = $6 AND  id_user= $7
        RETURNING *`,
        [
            system_name || null,
            peak_power_kwp || null,
            panel_orientation || null,
            tilt_angle_deg || null,
            installation_date || null,
            id,
            userId
        ]
    );
    return result.rows[0];
};

const updateStatus = async (id, status) =>{
    const result = await pool.query(
        `UPDATE photovoltaic_system
        SET system_status = $1
        WHERE id_system = $2
        RETURNING id_system, system_status`,
        [status, id]
    );
    return await result.rows[0];
};

const deleteSystem = async (id, userId) =>{
    const result = await pool.query(
        `DELETE FROM photovoltaic_system
        WHERE id_system = $1 AND id_user = $2
        RETURNING id_system`,
        [id, userId]
    );
    return result.rows[0];
};

const getDashboardData = async (id) =>{
    const result = await pool.query(
        `SELECT 
            ps.id_system,
            ps.system_name,
            ps.peak_power_kwp,
            ps.system_type,
            
            em.recorded_at AS last_recorded_at,
            em.power_w AS current_power_w,
            em.voltage_v AS current_voltage_v,
            em.current_a AS current_current_a,
            em.temperature_c AS current_temperature_c,
            
            COALESCE(daily.produced_kwh, 0) AS produced_today_kwh,
            COALESCE(daily.consumed_kwh, 0) AS consumed_today_kwh
            
        FROM photovoltaic_system ps
        LEFT JOIN LATERAL(
            SELECT * FROM energy_measurements
            WHERE id_system = ps.id_system
            ORDER BY recorded_at DESC
            LIMIT 1
        ) em ON true
         
        LEFT JOIN energy_measurements_summary daily
        ON daily.id_system = ps.id_system
        AND daily.summary_type = 'daily' 
        AND DATE(daily.time_start) = CURRENT_DATE
        
        WHERE ps.id_system = $1`,
        [id]
    );
    return result.rows[0];
};

module.exports={
    getById,
    getByUser,
    getByIdOnly,
    create,
    update,
    updateStatus,
    deleteSystem,
    getDashboardData
};
