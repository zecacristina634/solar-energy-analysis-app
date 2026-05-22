import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import {Stack} from 'expo-router';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Ionicons} from '@expo/vector-icons';

import {AuthProvider, useAuth} from '../store/authStore';
import {colors} from '../constants/colors';

const Tab = createBottomTabNavigator();

import Dashboard from './screens/Dashboard';
import Statistics from './screens/Statistics';
import Insights from './screens/Insights';
import ShiftableLoads from './screens/ShiftableLoads';
import Recommendations from './screens/Recommendations';
import Profile from './screens/Profile';

const TabNavigator = () =>{
    return (
        <Tab.Navigator
            screenOptions={({route})=> ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.primary,
                    borderTopColor: colors.borderLight,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 4,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.inactive,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
                tabBarIcon: ({color,size}) =>{
                    const icons = {
                        Dashboard: 'home-outline',
                        Statistics: 'bar-chart-outline',
                        Insights: 'bulb-outline',
                        Loads: 'flash-outline',
                        Recommendations: 'notifications-outline',
                        Profile: 'person-outline',
                    };

                    return <Ionicons name={icons[route.name]} size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={Dashboard}/>
            <Tab.Screen name="Statistics" component={Statistics}/>
            <Tab.Screen name="Insights" component={Insights}/>
            <Tab.Screen name="Loads" component={ShiftableLoads}/>
            <Tab.Screen name="Recommendations" component={Recommendations}/>
            <Tab.Screen name="Profile" component={Profile}/>
        </Tab.Navigator>
    );
};

const AppNavigator = () =>{
    const {token, loading} = useAuth();

    if(loading){
        return (
            <View style={{ flex:1 , justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryDark}}>
                <ActivityIndicator size="large" color={colors.accent}/>
            </View>
        );
    }

    if (token){
        return <TabNavigator/>;
    }

    return (
        <Stack screenOptions={{ headerShown:false}}>
            <Stack.Screen name="auth/Login"/>
            <Stack.Screen name="auth/Register"/>
        </Stack>
    );
};

export default function RootLayout() {
    return (
        <AuthProvider>
            <AppNavigator/>
        </AuthProvider>
    );
}