const systemModel = require('../models/systemModel');
const pairingModel = require('../models/pairingModel');
const measurementModel = require('../models/measurementModel');
const forecastModel = require('../models/forecastModel');
const generatePairingCode = require('../utils/generatePairingCode');
const simulationJob = require('../utils/simulationJob');
const {simulateFullDay} = require('../utils/solarSimulation');
const forecastController = require('../controllers/forecastController')

const createSystem = async (req, res, next) =>{
    try{
        const {
            system_name,
            peak_power_kwp,
            panel_orientation,
            tilt_angle_deg,
            system_type,
            installation_date,
            latitude,
            longitude
        } = req.body;

        if(!system_type) {
            return res.status(400).json({message: 'System type is required'});
        }

        if(!['real', 'simulated'].includes(system_type)){
            return res.status(400).json({message: 'System type must be real or simulated'});
        }

        const system = await systemModel.create(req.user.id_user, {
            system_name,
            peak_power_kwp,
            panel_orientation,
            tilt_angle_deg,
            system_type,
            installation_date,
            latitude,
            longitude
        });

        res.status(201).json({system});
    } catch (err){
        next(err);
    }
};

const getUserSystem = async (req, res , next) =>{
    try{
        const systems = await systemModel.getByUser(req.user.id_user);
        res.status(200).json({systems});
    } catch (err){
        next(err);
    }
};

const getSystemById = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.id, req.user.id_user);

        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        res.status(200).json({system});
    } catch (err){
        next(err);
    }
};

const getDashboardData = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.id, req.user.id_user);

        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const dashboard = await systemModel.getDashboardData(req.params.id);

        res.status(200).json({ dashboard });
    } catch (err){
        next(err);
    }
};

const updateSystem = async (req, res, next) =>{
    try{
        const {
            system_name,
            peak_power_kwp,
            panel_orientation,
            tilt_angle_deg,
            installation_date,
            latitude,
            longitude
        } = req.body;

        const system = await systemModel.getById(req.params.id, req.user.id_user);

        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const updatedSystem = await systemModel.update(req.params.id, req.user.id_user, {
            system_name,
            peak_power_kwp,
            panel_orientation,
            tilt_angle_deg,
            installation_date,
            latitude,
            longitude
        });

        res.status(200).json({ system: updatedSystem});
    } catch (err){
        next(err);
    }
};

const deleteSystem = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.id, req.user.id_user);

        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        await systemModel.deleteSystem(req.params.id, req.user.id_user);

        res.status(200).json({message: 'System deleted successfully'});
    } catch (err){
        next(err);
    }
};

const pairSystem = async (req, res, next) =>{
    try{
        const {code_value} = req.body;

        if(!code_value){
            return res.status(400).json({message: 'Pairing code is required'});
        }

        const code = await pairingModel.findByCode(code_value);

        if(!code){
            return res.status(404).json({message: 'Invalid pairing code'});
        }

        if(code.is_used){
            return res.status(400).json({message: 'Pairing code already used'});
        }

        if(new Date(code.expires_at) < new Date()){
            return res.status(400).json({message: 'Pairing code expired'});
        }

        if(code.id_system){
            await pairingModel.markAsUsed(code_value);
            const system = await systemModel.getByIdOnly(code.id_system);
            return res.status(200).json({
                message: 'Device paired successfully',
                system
            });
        }

        const system = await systemModel.create(req.user.id_user,{
            system_name: 'Solar System ',
            system_type: 'real'
        });

        await pairingModel.assignSystem(code_value, system.id_system);

        res.status(200).json({
            message: 'Device paired successfully',
            system
        });
    } catch (err){
        next(err);
    }
};

const registerPairingCode = async (req, res, next) =>{
    try{
        const {code_value} = req.body;
        if(!code_value){
            return res.status(400).json({message: 'Pairing code is required'});
        }

        const existing = await pairingModel.findByCode(code_value);
        if(existing){
            return res.status(200).json({message: 'Code already registered'});
        }

        const expiresAt = new Date(Date.now() + 5*60*1000);
        await pairingModel.create(null, code_value, expiresAt);

        res.status(201).json({message: 'Pairing code registered successfully'});
    } catch(err){
        next(err);
    }
};

const getPairingStatus = async (req, res, next) =>{
    try{
        const code = await pairingModel.findByCodeAny(req.params.code);
        if(!code){
            return res.status(404).json({message: 'Code not found'});
        }

        res.status(200).json({
            is_used: code.is_used,
            id_system: code.id_system,
            expires_at: code.expires_at
        });
    } catch(err){
        next(err);
    }
};

const startSimulation = async (req, res, next) => {
    try{
        const{
            system_name,
            peak_power_kwp,
            panel_orientation,
            tilt_angle_deg,
            latitude,
            longitude
        } = req.body;

        const system = await systemModel.create(req.user.id_user, {
            system_name: system_name || 'Simulated System',
            peak_power_kwp: peak_power_kwp || 5,
            panel_orientation: panel_orientation || 'South',
            tilt_angle_deg: tilt_angle_deg || 30,
            system_type: 'simulated',
            latitude: latitude || 44.43,
            longitude: longitude || 26.10
        });

        const codeValue = generatePairingCode();
        const expiresAt = new Date(Date.now() + 24*60*60*1000);
        await pairingModel.create(system.id_system, codeValue, expiresAt);

        res.status(201).json({
            message: 'Simulation started successfully',
            system,
            pairing_code: codeValue
        });
    } catch (err){
        next(err);
    }
};

const stopSimulation = async (req, res, next) => {
    try{
        const system = await systemModel.getById(req.params.id, req.user.id_user);

        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        if(system.system_type !== 'simulated'){
            return res.status(400).json({message: 'System is not a simulated system'});
        }

        simulationJob.stopJob(system.id_system);

        const updatedSystem = await systemModel.updateStatus(req.params.id, 'inactive');

        res.status(200).json({
            message: 'Simulation stopped successfully',
            system: updatedSystem
        });
    } catch (err){
        next(err);
    }
};

const runSimulation = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.id, req.user.id_user);

        if(!system) {
            return res.status(404).json({message: 'System not found'});
        }

        if(system.system_type !== 'simulated'){
            return res.status(400).json({message: 'System is not a simulated system'});
        }

        if(simulationJob.isRunning(system.id_system)){
            return res.status(400).json({message: 'Simulation already running'});
        }

        const weatherData = req.body.weatherData || {};

        const today = new Date();

        const openMeteoData = await forecastController.fetchOpenMeteo(
            system.latitude || 44.43,
            system.longitude || 26.10
        );
        const hourlyWeatherData = forecastController.getTodayHourlyWeather(openMeteoData);

        const fullDayMeasurements = simulateFullDay(
            today,
            system,
            weatherData,
            30,
            hourlyWeatherData
        );

        for(const measurement of fullDayMeasurements){
            await measurementModel.addMeasurement(system.id_system, measurement);
        }

        console.log(`[SIMULATION] Populated ${fullDayMeasurements.length} measurements for system ${system.id_system}`);

        try {
            const daily = openMeteoData.daily;
            for (let i = 0; i < daily.time.length; i++) {
                const avgTemp = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
                const dayMeasurements = simulateFullDay(new Date(daily.time[i]), system, {
                    temperature_c: avgTemp,
                    cloud_coverage: daily.cloudcover_mean[i]
                });
                const predictedKwh = dayMeasurements.reduce((sum, m) =>
                    sum + (parseFloat(m.power_w) || 0) * 0.5 / 1000, 0);
                await forecastModel.upsert(system.id_system, {
                    forecast_date: daily.time[i],
                    temperature_c: avgTemp,
                    solar_irradiance: daily.shortwave_radiation_sum[i],
                    cloud_coverage: daily.cloudcover_mean[i],
                    predicted_production_kwh: parseFloat(predictedKwh.toFixed(4))
                });
            }
            console.log(`[SIMULATION] Saved forecasts for system ${system.id_system}`);
        } catch (forecastErr) {
            console.warn('[SIMULATION] Could not save forecasts:', forecastErr.message);
        }

        simulationJob.startJob(system, weatherData);

        await systemModel.updateStatus(system.id_system, 'active');

        res.status(200).json({
            message: 'Simulation running',
            system_id: system.id_system,
            measurements_populated: fullDayMeasurements.length
        });
    } catch(err){
        next(err);
    }
};

module.exports ={
    createSystem,
    getUserSystem,
    getSystemById,
    getDashboardData,
    updateSystem,
    deleteSystem,
    pairSystem,
    registerPairingCode,
    getPairingStatus,
    startSimulation,
    stopSimulation,
    runSimulation
};