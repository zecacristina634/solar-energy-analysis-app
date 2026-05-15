const pool = require('../config/db');

const create = async (systemId, codeValue, expiresAt) =>{
    const result = await pool.query(
        `INSERT INTO pairing_codes
        (id_system, code_value, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [systemId, codeValue, expiresAt]
    );
    return result.rows[0];
};

const findByCode = async (codeValue) =>{
    const result = await pool.query(
        `SELECT * FROM pairing_codes
        WHERE code_value = $1
        AND is_used = false
        AND expires_at > NOW()`,
        [codeValue]
    );
    return result.rows[0];
};

const findByCodeAny = async (codeValue) =>{
    const result = await pool.query(
        `SELECT * FROM pairing_codes
        WHERE code_value = $1`,
        [codeValue]
    );
    return result.rows[0];
};

const findActiveBySystem = async (systemId) =>{
    const result = await pool.query(
        `SELECT * FROM pairing_codes
        WHERE id_system = $1
        AND is_used = false
        AND  expires_at > NOW()
        ORDER BY generated_at DESC
        LIMIT 1`,
        [systemId]
    );
    return result.rows[0];
};

const assignSystem = async (codeValue, systemId) =>{
    const result = await pool.query(
        `UPDATE pairing_codes
        SET id_system = $1, is_used = true
        WHERE code_value = $2
        RETURNING *`,
        [systemId, codeValue]
    );
    return result.rows[0];
}

const markAsUsed = async (codeValue) =>{
    const result = await pool.query(
        `UPDATE pairing_codes
        SET is_used = true
        WHERE code_value = $1
        RETURNING *`,
        [codeValue]
    );
    return result.rows[0];
};

const deleteExpired = async () =>{
    const result = await pool.query(
        `DELETE FROM pairing_codes
        WHERE  expires_at < NOW()`
    );
    return result.rowCount;
};

module.exports ={
    create,
    findByCode,
    findByCodeAny,
    findActiveBySystem,
    assignSystem,
    markAsUsed,
    deleteExpired
};