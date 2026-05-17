import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY ='gosolar_token';
const USER_KEY = 'gosolar_user';

export const saveToken = async (token) =>{
    try{
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch(err){
        console.error('Error saving token:', err);
    }
};

export const getToken = async ()=>{
    try{
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch(err){
        console.error('Error getting token:', err);
        return null;
    }
};

export const removeToken = async ()=>{
    try{
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (err){
        console.error('Error removing token:', err);
    }
};

export const saveUser = async (user)=>{
    try{
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }  catch(err){
        console.error('Error saving user:', err);
    }
};

export const getUser = async ()=>{
    try{
        const user = await AsyncStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch(err){
        console.error('Error getting user:', err);
    }
};

export const removeUser = async ()=>{
    try{
        await AsyncStorage.removeItem(USER_KEY);
    } catch(err){
        console.error('Error removing user', err);
    }
};

export const clearStorage = async ()=>{
    try{
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch(err){
        console.error('Error clearing storage:', err);
    }
};