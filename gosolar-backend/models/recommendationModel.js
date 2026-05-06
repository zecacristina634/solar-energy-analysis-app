const pool = require('../config/db');

const create = async (userId, systemId, data) =>{
    const {
        recommendation_type,
        title,
        message,
        estimated_saving_kwh,
        estimated_saving_money
    } = data;

    const result = await pool.query(
        `INSERT INTO recommendations
        (id_user, id_system, recommendation_type, title, message,
        estimated_saving_kwh, estimated_saving_money)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            userId,
            systemId,
            recommendation_type,
            title,
            message,
            estimated_saving_kwh ?? null,
            estimated_saving_money ?? null
        ]
    );
    return result.rows[0];
};

const getByUser = async (userId) =>{
    const result = await pool.query(
        `SELECT r.*, ps.system_name 
        FROM recommendations r
        LEFT JOIN photovoltaic_system ps
        ON r.id_system = ps.id_system
        WHERE r.id_user = $1
        ORDER BY r.created_at DESC`,
        [userId]
    );
    return result.rows;
};

const getBySystem = async (systemId) =>{
    const result = await pool.query(
        `SELECT * FROM recommendations
        WHERE id_system = $1
        ORDER BY created_at DESC`,
        [systemId]
    );
    return result.rows;
};

const getUnreadByUser = async (userId) =>{
    const result = await pool.query(
        `SELECT r.*, ps.system_name
        FROM recommendations r
        LEFT JOIN photovoltaic_system ps 
        ON r.id_system = ps.id_system
        WHERE r.id_user = $1
        AND r.status = 'unread'
        ORDER BY r.created_at DESC`,
        [userId]
    );
    return result.rows;
};

const getByUserAndType = async (userId, recommendationType) =>{
    const result = await pool.query(
        `SELECT r.*, ps.system_name
        FROM recommendations r
        LEFT JOIN photovoltaic_system ps
        ON r.id_system = ps.id_system
        WHERE r.id_user = $1
        AND r.recommendation_type = $2
        ORDER BY r.created_at DESC`,
        [userId, recommendationType]
    );
    return result.rows;
};

const markAsRead = async (id, userId) =>{
    const result = await pool.query(
        `UPDATE recommendations
        SET status= 'read'
        WHERE id_recommendation = $1
        AND id_user = $2
        RETURNING *`,
        [id, userId]
    );
    return result.rows[0];
};

const markAllAsRead = async (userId) =>{
    const result = await pool.query(
        `UPDATE recommendations
        SET status = 'read'
        WHERE id_user = $1
        AND status = 'unread'
        RETURNING id_recommendation`,
        [userId]
    );
    return result.rowCount;
};

const deleteOld = async (userId) =>{
    const result = await pool.query(
        `DELETE FROM recommendations
        WHERE id_user = $1
        AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id_recommendation`,
        [userId]
    );
    return result.rowCount;
};

module.exports ={
    create,
    getByUser,
    getBySystem,
    getUnreadByUser,
    getByUserAndType,
    markAsRead,
    markAllAsRead,
    deleteOld
};