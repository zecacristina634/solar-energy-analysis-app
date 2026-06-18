const axios = require('axios');
const systemModel = require('../models/systemModel');
const forecastModel = require('../models/forecastModel');
const {simulateFullDay} = require('../utils/solarSimulation');

const fetchOpenMeteo = async(latitude, longitude) =>{
    const url = `https://api.open-meteo.com/v1/forecast`;

    const response = await axios.get(url, {
        params: {
            latitude,
            longitude,
            daily: [
                'temperature_2m_max',
                'temperature_2m_min',
                'cloudcover_mean',
                'shortwave_radiation_sum'
            ].join(','),
            hourly: [
                'temperature_2m',
                'cloudcover',
                'shortwave_radiation'
            ].join(','),
            timezone: 'Europe/Bucharest',
            forecast_days: 9
        }
    });

    return response.data;
};

const fetchForecast = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const latitude = system.latitude || 44.43;
        const longitude = system.longitude || 26.10;

        const weatherData = await fetchOpenMeteo(latitude, longitude);
        const daily = weatherData.daily;

        const savedForecast = [];

        for(let i=0; i<daily.time.length; i++){
            const date = daily.time[i];
            const tempMax = daily.temperature_2m_max[i];
            const tempMin = daily.temperature_2m_min[i];
            const avgTemp = (tempMax + tempMin)/2;
            const cloudCoverage = daily.cloudcover_mean[i];
            const solarIrradiance = daily.shortwave_radiation_sum[i];

            const dayDate = new Date(date);
            const measurements = simulateFullDay(dayDate, system, {
                temperature_c: avgTemp,
                cloud_coverage: cloudCoverage
            });

            const predictedKwh = measurements.reduce((sum, m)=>{
                return sum + (parseFloat(m.power_w)|| 0) * 0.5/1000; // 0.5h = 30min
            }, 0);


            const forecast = await forecastModel.upsert(system.id_system, {
                forecast_date: date,
                temperature_c: avgTemp,
                solar_irradiance: solarIrradiance,
                cloud_coverage: cloudCoverage,
                predicted_production_kwh: parseFloat(predictedKwh.toFixed(4))
            });

            savedForecast.push(forecast);
        }

        res.status(200).json({
            message: `Forecast fetched successfully for ${savedForecast.length} days`,
            forecasts: savedForecast
        });
    } catch(err){
        next(err);
    }
};

const getTodayHourlyWeather = (weatherData) =>{
    const hourly = weatherData.hourly;
    if(!hourly)
        return null;

    const hourlyByHour = {};

    for (let i =0; i<hourly.time.length;i++){
        const time = new Date(hourly.time[i]);
        const today = new Date();

        if( time.getDate()=== today.getDate() && time.getMonth()===today.getMonth()){
            const hour = time.getHours();
            hourlyByHour[hour] = {
                temperature_c: hourly.temperature_2m[i],
                cloud_coverage: hourly.cloudcover[i],
                solar_irradiance: hourly.shortwave_radiation[i]
            };
        }
    }

    return hourlyByHour;
};

const getWeeklyForecast = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const forecasts = await forecastModel.getWeeklyForecast(req.params.systemId);

        res.status(200).json({forecasts});
    } catch(err){
        next(err);
    }
};

const getForecastByDate = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const forecast = await forecastModel.getByDate(req.params.systemId, req.params.date);

        if(!forecast){
            return res.status(404).json({message: 'Forecast not found for this date'});
        }

        res.status(200).json({forecast});
    } catch(err){
        next(err);
    }
};

const deletePastForecasts = async (req, res, next)=>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const count = await forecastModel.deleteOld(req.params.systemId);

        res.status(200).json({message: `${count} past forecasts deleted`});
    } catch(err){
        next(err)
    }
};

module.exports = {
    fetchForecast,
    getTodayHourlyWeather,
    getWeeklyForecast,
    getForecastByDate,
    deletePastForecasts,
    fetchOpenMeteo
};