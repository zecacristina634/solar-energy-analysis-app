import api from './api';

export const generateReport = async (systemId, startDate, endDate, indicators = null) =>{
    const response = await api.post(`/reports/generate`,{
        systemId,
        startDate,
        endDate,
        indicators
    },{
        responseType: 'blob'
    });
    return response.data;
};