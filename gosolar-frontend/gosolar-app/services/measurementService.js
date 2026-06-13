import api from './api';

export const getLatestMeasurement = async (systemId) =>{
    const response = await api.get(`/measurements/${systemId}/latest`);
    return response.data;
};

export const getHistory = async (systemId, limit = 100, offset = 0) =>{
    const response = await api.get(`/measurements/${systemId}/history`,{
        params: {limit,offset}
    });
    return response.data;
};

export const getHistoryByPeriod = async (systemId, startDate, endDate) =>{
    const response = await api.get(`/measurements/${systemId}/history/period`,{
        params: {startDate, endDate}
    });
    return response.data;
};

export const getSummary = async (systemId, summaryType, startDate, endDate) =>{
    const response = await api.get(`/measurements/${systemId}/summary`,{
        params:{summaryType, startDate, endDate}
    });
    return response.data;
};

export const getDailyProduction = async (systemId, startDate, endDate) =>{
    const response = await api.get(`/measurements/${systemId}/daily`, {
        params: {startDate, endDate}
    });
    return response.data;
};

export const getMonthlyProduction = async (systemId, year) =>{
    const response = await api.get(`/measurements/${systemId}/monthly`,{
        params: {year}
    });
    return response.data;
};

export const getEnergyVsConsumption = async (systemId, startDate, endDate) =>{
    const response = await api.get(`/measurements/${systemId}/energy-vs-consumption`,{
        params: {startDate, endDate}
    });
    return response.data;
};

export const generateSummary = async (systemId, summaryType, startDate, endDate) =>{
    const response = await api.post(`/measurements/${systemId}/summary/generate`, {
        summaryType, startDate, endDate
    });
    return response.data;
};