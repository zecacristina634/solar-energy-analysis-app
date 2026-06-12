const pool = require('../config/db');

// appliance_catalog
const getAllCatalog = async (category = null, type = null)=>{
    let query = 'SELECT * FROM appliance_catalog';
    const params =[];
    const conditions =[];

    if(category){
        params.push(category);
        conditions.push(`appliance_category = $${params.length}`);
    }

    if(type){
        params.push(type);
        conditions.push(`appliance_type = $${params.length}`);
    }

    if (conditions.length > 0){
        query += ` WHERE `+ conditions.join(` AND `);
    }

    query += ` ORDER BY appliance_type, appliance_category, appliance_name`;
    
    const result = await pool.query(query, params);
    return result.rows;
};

const getCatalogById = async (id)=>{
    const result = await pool.query(
        `SELECT * FROM appliance_catalog WHERE id_catalog_appliance = $1`,
        [id]
    );
    return result.rows[0];
};

const getCategories = async () => {
    const result = await pool.query(
        `SELECT DISTINCT appliance_category
        FROM appliance_catalog
        ORDER BY appliance_category ASC`
    );
    return result.rows;
}

//user_constant_appliances
const getConstantByUser =async (userId) =>{
    const result = await pool.query(
        `SELECT uca.*,
        ac.appliance_name AS catalog_name,
        ac.appliance_category AS catalog_category, 
        ac.nominal_power_w AS catalog_power_w,
        ac.estimated_consumption_kwh AS catalog_consumption_kwh,
        ac.usage_time_minutes AS catalog_usage_time
        FROM user_constant_appliances uca
        LEFT JOIN appliance_catalog ac
        ON uca.id_catalog_appliance = ac.id_catalog_appliance
        WHERE uca.id_user = $1
        ORDER BY uca.id_user_constant_appliance`,
        [userId]
    );
    return result.rows;
};

const addConstant = async (userId, data)=> {
    const{
        id_catalog_appliance,
        custom_name,
        quantity,
        custom_estimated_consumption_kwh,
        custom_usage_time_minutes,
        custom_nominal_power_w
    } = data;
    
    const result = await pool.query(
        `INSERT INTO user_constant_appliances 
        (id_user, id_catalog_appliance, custom_name, quantity, custom_estimated_consumption_kwh,
        custom_usage_time_minutes, custom_nominal_power_w)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            userId,
            id_catalog_appliance || null,
            custom_name || null,
            quantity || 1,
            custom_estimated_consumption_kwh || null,
            custom_usage_time_minutes || null, 
            custom_nominal_power_w || null
        ]
        
    );
    return result.rows[0];
};

const updateConstant = async (id, userId, data) => {
    const {
        custom_name,
        quantity,
        custom_estimated_consumption_kwh,
        custom_usage_time_minutes,
        custom_nominal_power_w
    } = data;

    const result = await pool.query(
        `UPDATE user_constant_appliances
        SET custom_name = $1,
            quantity = $2,
            custom_estimated_consumption_kwh = $3,
            custom_usage_time_minutes = $4,
            custom_nominal_power_w = $5
        WHERE id_user_constant_appliance = $6 AND id_user = $7
        RETURNING *`,
        [
            custom_name || null,
            quantity || 1,
            custom_estimated_consumption_kwh || null,
            custom_usage_time_minutes || null, 
            custom_nominal_power_w || null,
            id,
            userId
        ]
    );
    return result.rows[0];
};

const deleteConstant = async (id, userId) =>{
    const result = await pool.query(
        `DELETE FROM user_constant_appliances
        WHERE id_user_constant_appliance = $1 AND id_user = $2
        RETURNING id_user_constant_appliance`,
        [id, userId]
    );
    return result.rows[0];
};

//user_shiftable_loads
const getShiftableByUser =async (userId) =>{
    const result = await pool.query(
        `SELECT usl.*,
        ac.appliance_name AS catalog_name,
        ac.appliance_category AS catalog_category, 
        ac.nominal_power_w AS catalog_power_w,
        ac.estimated_consumption_kwh AS catalog_consumption_kwh,
        ac.usage_time_minutes AS catalog_usage_time
        FROM user_shiftable_loads usl
        LEFT JOIN appliance_catalog ac
        ON usl.id_catalog_appliance = ac.id_catalog_appliance
        WHERE usl.id_user = $1
        ORDER BY usl.priority_level, usl.id_user_flexible_appliance`,
        [userId]
    );
    return result.rows;
};

const addShiftable = async (userId, data)=> {
    const{
        id_catalog_appliance,
        custom_name,
        quantity,
        custom_estimated_consumption_kwh,
        custom_usage_time_minutes,
        custom_nominal_power_w,
        preferred_start_time,
        preferred_end_time,
        earliest_start_time,
        latest_end_time,
        is_interruptible,
        priority_level
    } = data;

    const result = await pool.query(
        `INSERT INTO user_shiftable_loads 
        (id_user, id_catalog_appliance, custom_name, quantity, custom_estimated_consumption_kwh,
        custom_usage_time_minutes, custom_nominal_power_w, preferred_start_time,
        preferred_end_time, earliest_start_time, latest_end_time, is_interruptible, priority_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
            userId,
            id_catalog_appliance || null,
            custom_name || null,
            quantity || 1,
            custom_estimated_consumption_kwh || null,
            custom_usage_time_minutes || null, 
            custom_nominal_power_w || null,
            preferred_start_time || null,
            preferred_end_time || null,
            earliest_start_time || null,
            latest_end_time || null,
            is_interruptible || false,
            priority_level || 'medium'
        ]
    );
    return result.rows[0];
};

const updateShiftable = async (id, userId, data) => {
    const {
        custom_name,
        quantity,
        custom_estimated_consumption_kwh,
        custom_usage_time_minutes,
        custom_nominal_power_w,
        preferred_start_time,
        preferred_end_time,
        earliest_start_time,
        latest_end_time,
        is_interruptible,
        priority_level
    } = data;

    const result = await pool.query(
        `UPDATE user_shiftable_loads
        SET custom_name = $1,
            quantity = $2,
            custom_estimated_consumption_kwh = $3,
            custom_usage_time_minutes = $4,
            custom_nominal_power_w = $5,
            preferred_start_time = $6,
            preferred_end_time = $7,
            earliest_start_time = $8,
            latest_end_time = $9,
            is_interruptible = $10,
            priority_level = $11
        WHERE id_user_flexible_appliance = $12 AND id_user = $13
        RETURNING *`,
        [
            custom_name || null,
            quantity || 1,
            custom_estimated_consumption_kwh || null,
            custom_usage_time_minutes || null, 
            custom_nominal_power_w || null,
            preferred_start_time || null,
            preferred_end_time || null,
            earliest_start_time || null,
            latest_end_time || null,
            is_interruptible || false,
            priority_level || 'medium',
            id,
            userId
        ]
    );
    return result.rows[0];
};

const deleteShiftable = async (id, userId) =>{
    const result = await pool.query(
        `DELETE FROM user_shiftable_loads
        WHERE id_user_flexible_appliance = $1 AND id_user = $2
        RETURNING id_user_flexible_appliance`,
        [id, userId]
    );
    return result.rows[0];
};

module.exports ={
    getAllCatalog,
    getCatalogById,
    getCategories,
    getConstantByUser,
    addConstant,
    updateConstant,
    deleteConstant,
    getShiftableByUser,
    addShiftable,
    updateShiftable,
    deleteShiftable
};