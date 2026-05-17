import api from './api';

export const fetchForecast = async (systemId) =>{
    const response = await api.post(`/forecast/fetch/${systemId}`);
    return response.data;
};

export const getWeeklyForecast = async (systemId) =>{
    const response = await api.get(`/forecast/${systemId}`);
    return response.data;
};

export const getForecastByDate = async (systemId, date) =>{
    const response = await api.get(`/forecast/${systemId}/${date}`);
    return response.data;
};