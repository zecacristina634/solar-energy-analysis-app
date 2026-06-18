process.env.TZ = 'Europe/Bucharest';
const app = require('./app');
const { restoreActiveSimulations } = require('./utils/simulationJob');
const { scheduleWeeklySummary } = require('./utils/weeklySummaryJob');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`GoSolar server running on port ${PORT}`);
    await restoreActiveSimulations();
    scheduleWeeklySummary();
});