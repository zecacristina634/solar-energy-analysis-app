const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:{
        rejectUnauthorized: false
    }
});

pool.connect()
    .then(()=> console.log('Conectat la baza de date PostgreSQL'))
    .catch((err)=> console.error('Eroare conectare la DB:', err.message));

module.exports=pool;