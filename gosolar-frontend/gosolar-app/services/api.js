import axios from 'axios';
import { getToken } from '../utils/storage';

const API_URL ='https://solar-energy-analysis-app.onrender.com';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

api.interceptors.request.use(
    async (config) =>{
        const token = await getToken();
        if(token){
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) =>{
        if(error.response){
            console.error('API Error:', error.response.status, error.response.data);
        } else if(error.request){
            console.error('Network Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;