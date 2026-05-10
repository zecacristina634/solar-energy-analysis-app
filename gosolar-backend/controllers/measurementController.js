const measurementModel = require('../models/measurementModel');
const systemModel = require('../models/systemModel');
const applianceModel = require('../models/applianceModel');
const {calculateConstantConsumption} = require('../utils/consumptionCalculator');

const addMeasurement = async (req, res, next) =>{
    try{
        const{
            id_system,
            recorded_at,
            voltage_v,
            current_a,
            power_w,
            temperature_c
        } = req.body;

        if(!id_system){
            return res.status(400).json({message: 'System ID is required'});
        }

        const system = await systemModel.getByIdOnly(id_system);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const measurement = await measurementModel.addMeasurement(id_system,{
            recorded_at,
            voltage_v,
            current_a,
            power_w,
            temperature_c
        });

        res.status(201).json({measurement});
    } catch (err){
        next(err);
    }
};

const getLatestMeasurement = async(req, res, next)=>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const measurement = await measurementModel.getLastMeasurement(req.params.systemId);

        if(!measurement){
            return res.status(404).json({message: 'No measurements found'});
        }

        res.status(200).json({measurement});
    } catch (err){
        next(err);
    }
};

const getHistory = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const measurement = await measurementModel.getHistory(
            req.params.systemId,
            limit, 
            offset
        );

        res.status(200).json({measurement, limit, offset});
    } catch(err){
        next(err);
    }
};

const getHistoryByPeriod = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const {startDate, endDate} = req.query;

        if(!startDate || !endDate){
            return res.status(400).json({message: 'Start date and end date are required'});
        }

        const measurements = await measurementModel.getHistoryByPeriod(
            req.params.systemId,
            startDate,
            endDate
        );

        res.status(200).json({measurements});
    } catch(err){
        next(err);
    }
};

const getSummary = async(req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const {summaryType, startDate, endDate} = req.query;

        if(!summaryType || !startDate || !endDate){
            return res.status(400).json({message: 'Summary type, start date and end date are required'});
        }

        if(!['hourly', 'daily', 'monthly'].includes(summaryType)){
            return res.status(400).json({message: 'Summary type must be hourly, daily or monthly'});
        }

        const summary = await measurementModel.getSummary(
            req.params.systemId,
            summaryType,
            startDate,
            endDate
        );

        res.status(200).json({summary});
    } catch(err){
        next(err);
    }
};

const generateSummary = async(req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const {summaryType, startDate, endDate} = req.body;
        if(!summaryType || !startDate || !endDate){
            return res.status(400).json({message: 'Summary type, start date and end date are required'});
        }

        const measurements = await measurementModel.getHistoryByPeriod(
            req.params.systemId,
            startDate,
            endDate
        );

        if(measurements.length === 0){
            return res.status(404).json({message: 'No measurments found for this period'});
        }

        const voltages = measurements.map(m=> m.voltage_v).filter(v=> v !== null); 
        const currents = measurements.map(m=> m.current_a).filter(c=> c !== null); 
        const powers = measurements.map(m=> m.power_w).filter(p=> p !== null); 
        const temps = measurements.map(m=> m.temperature_c).filter(t=> t !== null); 

        const avg = (arr) => arr.length > 0 ? arr.reduce((a,b)=> a+parseFloat(b), 0)/ arr.length : null;
        const min = (arr) => arr.length > 0 ? Math.min(...arr.map(v => parseFloat(v))) : null;
        const max= (arr) => arr.length > 0 ? Math.max(...arr.map(v => parseFloat(v))) : null;

        const durationHours = (new Date(endDate) - new Date(startDate))/(1000*60*60);
        const producedKwh = avg(powers) * durationHours/1000;

        const constantAppliances = await applianceModel.getConstantByUser(req.user.id_user);
        const consumedKwh = calculateConstantConsumption(constantAppliances, durationHours);

        const summaryData = {
            summary_type: summaryType,
            time_start: startDate,
            avg_voltage_v: avg(voltages),
            avg_current_a: avg(currents),
            avg_power_w: avg(powers),
            min_temperature_c: min(temps),
            max_temperature_c: max(temps),
            avg_temperature_c: avg(temps),
            produced_kwh: producedKwh,
            consumed_kwh: consumedKwh
        };

        const existing = await measurementModel.getLatestSummary(req.params.systemId, summaryType);

        let summary;
        if(existing && existing.time_start === startDate){
            summary = await measurementModel.updateSummary(
                req.params.systemId,
                summaryType,
                startDate,
                summaryData
            );
        } else{
            summary = await measurementModel.addSummary(req.params.systemId, summaryData);
        }

        res.status(201).json({summary});
    } catch(err){
        next(err);
    }
};

const getDailyProduction = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const {startDate, endDate} = req.query;

        if(!startDate || !endDate){
            return res.status(400).json({message: 'Start date and end date are required'});
        }

        const production = await measurementModel.getDailyProduction(
            req.params.systemId,
            startDate,
            endDate
        );

        res.status(200).json({production});
    } catch(err){
        next(err)
    }
};

const getMonthlyProduction = async (req, res, next) =>{
     try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const year = parseInt(req.query.year) || new Date().getFullYear();

        const production = await measurementModel.getMonthlyProduction(
            req.params.systemId,
            year
        );

        res.status(200).json({production, year});
    } catch(err){
        next(err)
    }
};

const getEnergyVsConsumption = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const {startDate, endDate} = req.query;

        if(!startDate || !endDate){
            return res.status(400).json({message: 'Start date and end date are required'});
        }

        const data = await measurementModel.getEnergyVsConsumption(
            req.params.systemId,
            startDate,
            endDate
        );

        res.status(200).json({data});
    } catch (err){
        next(err);
    }
};

module.exports ={
    addMeasurement,
    getLatestMeasurement,
    getHistory,
    getHistoryByPeriod,
    getSummary,
    generateSummary,
    getDailyProduction,
    getMonthlyProduction,
    getEnergyVsConsumption
};