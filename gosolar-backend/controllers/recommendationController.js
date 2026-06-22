const recommendationModel = require('../models/recommendationModel');
const systemModel = require('../models/systemModel');
const {generateRecommendations: generateWithAi} = require('../utils/recommendationGenerator');
const recommendationJob = require('../utils/recommendationJob');

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

        const result = await generateWithAi(system, req.user.id_user, true);

        if(result.error && result.recommendations.length === 0){
            return res.status(200).json({
                message: result.error,
                recommendations :[]
            });
        }

        res.status(201).json(result);
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

const deleteRecommendation = async (req, res, next) => {
    try {
        const deleted = await recommendationModel.deleteById(req.params.id, req.user.id_user);
        if (!deleted) {
            return res.status(404).json({ message: 'Recommendation not found' });
        }
        res.status(200).json({ message: 'Recommendation deleted successfully' });
    } catch (err) {
        next(err);
    }
};

const startAutoRecommendations = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if (!system) {
            return res.status(404).json({ message: 'System not found' });
        }

        if(recommendationJob.isRecommendationJobRunning(system.id_system)){
            return res.status(400).json({message: 'Auto recommendations already running'});
        }

        recommendationJob.startRecommendationJob(system.id_system, req.user.id_user);

        res.status(200).json({message: 'Auto recommendations started'});
    } catch(err){
        next(err);
    }
};

const stopAutoRecommendations = async (req, res, next) =>{
    try{
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if (!system) {
            return res.status(404).json({ message: 'System not found' });
        }

        if(!recommendationJob.isRecommendationJobRunning(system.id_system)){
            return res.status(400).json({message: 'Auto recommendations not running'});
        }

        recommendationJob.stopRecommendationJob(system.id_system);

        res.status(200).json({message: 'Auto recommendations stopped'});
    } catch (err){
        next(err);
    }
};

const getAutoStatus = async (req, res, next) => {
    try {
        const system = await systemModel.getById(req.params.systemId, req.user.id_user);
        if (!system) {
            return res.status(404).json({ message: 'System not found' });
        }
        const running = recommendationJob.isRecommendationJobRunning(system.id_system);
        res.status(200).json({ running });
    } catch (err) {
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
    deleteOldRecommendations,
    deleteRecommendation,
    startAutoRecommendations,
    stopAutoRecommendations,
    getAutoStatus
};