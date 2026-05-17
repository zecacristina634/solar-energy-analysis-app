import { createContext, useContext, useState, useEffect } from "react";;
import { getToken, getUser, saveToken, saveUser, clearStorage } from "../utils/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({children}) =>{
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(()=>{
        const loadSession = async ()=>{
            try{
                const savedToken = await getToken();
                const savedUser = await getUser();
                if(savedToken && saveUser){
                    setToken(saveToken);
                    setUser(savedUser);
                }
            } catch(err){
                console.error('Error loading session:', err);
            } finally{
                setLoading(false);
            }
        };
        loadSession();
    }, []);

    const login = async (token, user) =>{
        await saveToken(token);
        await saveUser(user);
        setToken(token);
        setUser(user);
    };

    const logout = async ()=>{
        await clearStorage();
        setToken(null);
        setUser(null);
    };

    const updateUser = async (updatedUser) =>{
        await saveUser(updatedUser);
        setUser(updatedUser);
    };

    return(
        <AuthContext.Provider value={{token, user, loading, login, logout, updateUser}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () =>{
    const context = useContext(AuthContext);
    if(!context){
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};