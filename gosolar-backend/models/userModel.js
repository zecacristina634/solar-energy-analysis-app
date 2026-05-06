const pool = require('../config/db');

const findById = async (id)=>{
    const result = await pool.query(
        'SELECT id_user, name, email, created_at FROM users WHERE id_user = $1',
        [id] 
    );
    return result.rows[0];
};

const findByEmail = async (email)=>{
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email] 
    );
    return result.rows[0];
};

const create = async (name, email, passwordHash) =>{
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id_user, name, email, created_at`,
        [name, email, passwordHash]
    );
    return result.rows[0];
};

const updateProfile = async (id, name, email) =>{
    const result = await pool.query(
        `UPDATE users SET name = $1, email = $2
        WHERE id_user = $3
        RETURNING id_user, name, email, created_at`,
        [name, email, id]
    );
    return result.rows[0];
};

const updatePassword = async (id, passwordHash) =>{
    const result = await pool.query(
        `UPDATE users SET  password_hash =$1
        WHERE id_user =$2
        RETURNING id_user`,
        [passwordHash, id]
    );
    return result.rows[0];
};

const deleteUser = async (id)=>{
    const result= await pool.query(
        `DELETE FROM users WHERE id_user = $1
        RETURNING id_user`,
        [id]
    );
    return result.rows[0];
};

const findByEmailExcludingId = async (email, id) =>{
    const result = await pool.query(
        `SELECT id_user FROM users WHERE email = $1 AND id_user != $2`,
        [email, id]
    );
    return result.rows[0];
};

module.exports={
    findByEmail,
    findById,
    create,
    updateProfile,
    updatePassword,
    deleteUser,
    findByEmailExcludingId
};