process.env.TZ = 'Europe/Bucharest';
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log(`GoSolar server running on port ${PORT}`);
});