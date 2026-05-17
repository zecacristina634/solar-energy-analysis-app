import api from './api';

export const getCatalog = async (category = null, type = null) =>{
    const response = await api.get(`/appliances/catalog`,{
        params: {category, type}
    });
    return response.data;
};

export const getCatalogById = async (id) =>{
    const response = await api.get(`/appliances/catalog/${id}`);
    return response.data;
};

export const getCategories = async () =>{
    const response = await api.get(`/appliances/catalog/categories`);
    return response.data;
};

export const getConstantAppliances = async () =>{
    const response = await api.get(`/appliances/constant`);
    return response.data;
};

export const addConstantAppliance = async (data) =>{
    const response = await api.post(`/appliances/constant`, data);
    return response.data;
};

export const updateConstantAppliance = async (id, data) =>{
    const response = await api.put(`/appliances/constant/${id}`, data);
    return response.data;
};

export const deleteConstantAppliance = async (id) =>{
    const response = await api.delete(`/appliances/constant/${id}`);
    return response.data;
};

export const getShiftableLoads = async () =>{
    const response = await api.get(`/appliances/shiftable`);
    return response.data;
};

export const addShiftableLoad = async (data) =>{
    const response = await api.post(`/appliances/shiftable`, data);
    return response.data;
};

export const updateShiftableLoad = async (id, data) =>{
    const response = await api.put(`/appliances/shiftable/${id}`, data);
    return response.data;
};

export const deleteShiftableLoad = async (id) =>{
    const response = await api.delete(`/appliances/shiftable/${id}`);
    return response.data;
};