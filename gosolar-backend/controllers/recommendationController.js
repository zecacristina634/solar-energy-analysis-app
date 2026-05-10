const recommendationModel = require('../models/recommendationModel');
const systemModel = require('../models/systemModel');
const measurementModel = require('../models/measurementModel');
const applianceModel = require('../models/applianceModel');
const {calculateConstantConsumption} = require('../utils/consumptionCalculator');
const { parse } = require('dotenv');

const getRecommendations = async (req, res, next) =>{
    try{
        const recommendations = await recommendationModel.getByUser(req.user.id_user);
        
        res.status(200).json({recommendations});
    } catch(err){
        next(err);
    }
};

const getRecommendationsBySystem = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }      

        const recommendations = await recommendationModel.getBySystem(req.params.systemId);
        res.status(200).json({recommendations});
    } catch(err){
        next(err);
    }
};

const getUnreadRecommendations = async (req, res, next)=> {
    try{
        const recommendations = await recommendationModel.getUnreadByUser(req.user.id_user);
        res.status(200).json({recommendations});
    } catch(err){
        next(err);
    }
};

const getRecommendationsByType = async (req, res, next) =>{
    try{
        const recommendations = await recommendationModel.getByUserAndType(
            req.user.id_user,
            req.params.type
        );
        res.status(200).json({recommendations});
    } catch(err){
        next(err);
    }
};

const getRecommendationById = async (req, res, next) =>{
    try{
        const recommendations = await recommendationModel.getByUser(req.user.id_user);
        const recommendation = recommendations.find(
            r=> r.id_recommendation === parseInt(req.params.id)
        );
        
        if(!recommendation){
            return res.status(404).json({message: 'Recommendation not found'});
        }

        res.status(200).json({recommendation});
    } catch(err){
        next(err);
    }
};

const generateRecommendations = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        const latestMeasurement = await measurementModel.getLastMeasurement(req.params.systemId);
        if(!latestMeasurement){
            return res.status(404).json({message: 'No measurements found'});
        }

        const constantAppliances = await applianceModel.getConstantByUser(req.user.id_user);
        const shiftableLoads = await applianceModel.getShiftableByUser(req.user.id_user);
        
        const currentPowerW = parseFloat(latestMeasurement.power_w) || 0;
        const constantConsumptionW = calculateConstantConsumption(constantAppliances, 1) * 1000;
        const surplusW = currentPowerW - constantConsumptionW;

        //aici avem apel ai
        const placeholder = {
            recommendation_type: 'ai_pending',
            title: 'ai recommendations',
            message: `Current power: ${Math.round(currentPowerW)}W. Constant consumption: ${Math.round(constantConsumptionW)}W. Surplus: ${Math.round(surplusW)}W. Shiftable loads: ${shiftableLoads.length}.`,
            estimated_saving_kwh: null,
            estimated_saving_money: null
        };

        const saved = await recommendationModel.create(
            req.user.id_user,
            req.params.systemId,
            placeholder
        );

        res.status(201).json({
            recommendation: saved,
            data: {
                current_power_w: currentPowerW,
                constant_consumption_w: constantConsumptionW,
                surplus_w: surplusW,
                shiftable_loads: shiftableLoads.length
            }
        });
    } catch(err){
        next(err);
    }
};

const markAsRead = async (req, res, next) =>{
    try{
        const recommendation = await recommendationModel.markAsRead(
            req.params.id,
            req.user.id_user
        );
        
        if(!recommendation){
            return res.status(404).json({message: 'Recommendation not found'});
        }

        res.status(200).json({recommendation});
    } catch(err){
        next(err);
    }
};

const markAllAsRead = async (req, res, next) =>{
    try{
        const count = await recommendationModel.markAllAsRead(req.user.id_user);
        res.status(200).json({message: `${count} recommendations marked as read`});
    } catch(err){
        next(err);
    }
};

const deleteOldRecommendations = async (req, res, next) =>{
    try{
        const count = await recommendationModel.deleteOld(req.user.id_user);
        res.status(200).json({message: `${count} old recommendations deleted`});      
    } catch(err){
        next(err);
    }
};

module.exports ={
    getRecommendations,
    getRecommendationsBySystem,
    getUnreadRecommendations,
    getRecommendationsByType,
    getRecommendationById,
    generateRecommendations,
    markAsRead,
    markAllAsRead,
    deleteOldRecommendations
};