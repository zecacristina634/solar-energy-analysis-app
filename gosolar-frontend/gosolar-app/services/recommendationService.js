import api from './api';

export const getRecommendations = async () =>{
    const response = await api.get(`/recommendations`);
    return response.data;
};

export const getUnreadRecommendations = async () =>{
    const response = await api.get(`/recommendations/unread`);
    return response.data;
};

export const getRecommendationsBySystem = async (systemId) =>{
    const response = await api.get(`/recommendations/system/${systemId}`);
    return response.data;
};

export const generateRecommendations = async (systemId) =>{
    const response = await api.post(`/recommendations/generate/${systemId}`);
    return response.data;
};

export const startAutoRecommendations = async (systemId) =>{
    const response = await api.post(`/recommendations/auto/start/${systemId}`);
    return response.data;
};

export const stopAutoRecommendations = async (systemId) =>{
    const response = await api.post(`/recommendations/auto/stop/${systemId}`);
    return response.data;
};

export const markAsRead = async (id) =>{
    const response = await api.patch(`/recommendations/${id}/read`);
    return response.data;
};

export const markAllAsRead = async () =>{
    const response = await api.patch(`/recommendations/read-all`);
    return response.data;
};

export const deleteOldRecommendations = async () =>{
    const response = await api.delete(`/recommendations/old`);
    return response.data;
};