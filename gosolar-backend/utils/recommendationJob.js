const cron = require('node-cron');
const pool = require('../config/db');
const systemModel = require('../models/systemModel');
const {generateRecommendations } = require('./recommendationGenerator');

const activeRecommendationJobs = new Map();

const startRecommendationJob = (systemId, userId) =>{
    if(activeRecommendationJobs.has(systemId)){
        console.log(`[RECOMMENDATION JOB] Already running for system ${systemId}`);
        return false;
    }

    console.log(`[RECOMMENDATION JOB] Starting for system ${systemId}`);

    const job = cron.schedule('0 */2 * * *', async () =>{
        try{
            const system = await systemModel.getByIdOnly(systemId);
            if(!system || system.system_status !== 'active') return;

            const result = await generateRecommendations(system, userId, false);
            if(result.recommendations?.length > 0){
                console.log(`[RECOMMENDATION JOB] Generated ${result.recommendations.length} recommendations for system ${systemId}`);
            }
        } catch (err){
            console.error(`[RECOMMENDATION JOB] Error for system ${systemId}:`, err.message);
        }
    });

    activeRecommendationJobs.set(systemId, job);
    return true;
};

const stopRecommendationJob = (systemId) =>{
    const job = activeRecommendationJobs.get(systemId);
    if(!job){
        console.log(`[RECOMMENDATION JOB] No job found for system ${systemId}`);
        return false;
    }

    job.stop();
    activeRecommendationJobs.delete(systemId);
    console.log(`[RECOMMENDATION JOB] Stopped for system ${systemId}`);
    return true;
};

const isRecommendationJobRunning = (systemId) =>{
    return activeRecommendationJobs.has(systemId);
};

module.exports ={
    startRecommendationJob,
    stopRecommendationJob,
    isRecommendationJobRunning
};