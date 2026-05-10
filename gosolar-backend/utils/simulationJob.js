const cron = require('node-cron');
const { simulateMeasurement} = require('./solarSimulation');
const measurementModel = require('../models/measurementModel');

const activeJobs = new Map();

const startJob = (system, weatherData = {} ) =>{
    const systemId = system.id_system;

    if(!systemId){
        console.error(`[SIMULATION] Cannot start job - invalid system id`);
        return false;
    }

    if(activeJobs.has(systemId)){
        console.log(`[SIMULATION] Job already running for system ${systemId}`);
        return false;
    }

    console.log(`[SIMULATION] Starting job for system ${systemId}`);

    const job = cron.schedule(`*/30 * * * * *`, async () =>{
        try{
            const now = new Date();

            const measurement = simulateMeasurement(now, system, weatherData);

            await measurementModel.addMeasurement(systemId, measurement);

            console.log(`[SIMULATION] System ${systemId} - Power: ${measurement.power_w}W`);
        } catch(err){
            console.error(`[SIMULATION] Error for system ${systemId}: `, err.message);
        }
    });

    activeJobs.set(systemId, job);
    return true;
};

const stopJob = (systemId) => {
    const job = activeJobs.get(systemId);

    if(!job) {
        console.log(`[SIMULATION] No job found for system ${systemId}`);
        return false;
    }

    job.stop();
    activeJobs.delete(systemId);
    console.log(`[SIMULATION] Stopped job for system ${systemId}`);
    return true;
};

const isRunning = (systemId) =>{
    return activeJobs.has(systemId);
};

const getActiveJobsCount = () =>{
    return activeJobs.size;
};

module.exports ={
    startJob,
    stopJob,
    isRunning,
    getActiveJobsCount
};
