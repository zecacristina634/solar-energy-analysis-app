process.env.TZ = 'Europe/Bucharest';
const app = require('./app');
const pool = require('./config/db');
const simulationJob = require('./utils/simulationJob');

const PORT = process.env.PORT || 3000;

const restoreActiveSimulations = async () => {
    try {
        const result = await pool.query(
            `SELECT * FROM photovoltaic_system WHERE system_type = 'simulated' AND system_status = 'active'`
        );
        for (const system of result.rows) {
            simulationJob.startJob(system, {});
        }
        if (result.rows.length > 0) {
            console.log(`[STARTUP] Restored ${result.rows.length} simulation job(s)`);
        }
    } catch (err) {
        console.error('[STARTUP] Failed to restore simulations:', err.message);
    }
};

app.listen(PORT, async () => {
    console.log(`GoSolar server running on port ${PORT}`);
    await restoreActiveSimulations();
});