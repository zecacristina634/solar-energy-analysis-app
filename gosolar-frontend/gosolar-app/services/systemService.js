import api from './api';

export const getSystems = async ()=>{
    const response = await api.get('/systems');
    return response.data;
};

export const getSystemById = async (id) =>{
    const response = await api.get(`/systems/${id}`);
    return response.data
};

export const getDashboardData = async (id)=>{
    const response = await api.get(`/systems/${id}/dashboard`);
    return response.data;
};

export const createSystem = async (data)=>{
    const response = await api.post('/systems', data);
    return response.data;
};

export const updateSystem = async (id, data)=>{
    const response = await api.put(`/systems/${id}`, data);
    return response.data;
};

export const deleteSystem = async (id)=>{
    const response = await api.delete(`/systems/${id}`);
    return response.data;
};

export const pairSystem = async (codeValue)=>{
    const response = await api.post('/systems/pair', {code_value: codeValue});
    return response.data;
};

export const startSimulation = async (data)=>{
    const response = await api.post('/systems/simulate/start', data);
    return response.data;
};

export const runSimulation = async (id, weatherData)=>{
    const response = await api.post(`/systems/simulate/run/${id}`, {weatherData});
    return response.data;
};

export const stopSimulation = async (id)=>{
    const response = await api.post(`/systems/simulate/stop/${id}`);
    return response.data;
};

