const applianceModel = require('../models/applianceModel');

const getCatalog = async (req, res, next) =>{
    try{
        const { category, type} = req.query;
        const appliances = await applianceModel.getAllCatalog(category, type);
        
        res.status(200).json({appliances});
    } catch(err){
        next(err);
    }
};

const getCatalogById = async (req, res, next) =>{
    try{
        const appliance = await applianceModel.getCatalogById(req.params.id);
        if(!appliance){
            return res.status(404).json({message: 'Appliance not found'});
        }      

        res.status(200).json({appliance});
    } catch(err){
        next(err);
    }
};

const getCategories = async (req, res, next) =>{
    try{
        const categories = await applianceModel.getCategories();

        res.status(200).json({categories});
    } catch(err){
        next(err);
    }
};

const getConstantAppliances = async (req, res, next) =>{
    try{
        const appliances = await applianceModel.getConstantByUser(req.user.id_user);
        
        res.status(200).json({appliances});
    } catch(err){
        next(err);
    }
};

const addConstantAppliance = async (req, res, next) =>{
    try{
        const {
            id_catalog_appliance,
            custom_name,
            quantity,
            custom_estimated_consumption_kwh,
            custom_usage_time_minutes,
            custom_nominal_power_w
        } = req.body;

        if(!id_catalog_appliance && !custom_name){
            return res.status(400).json({message: 'Either catalog appliance or custom name is required'});
        }

        if(id_catalog_appliance && custom_name){
            return res.status(400).json({message: 'Cannot have both catalog appliance and custom name'});
        }

        const appliance = await applianceModel.addConstant(req.user.id_user,{
            id_catalog_appliance,
            custom_name,
            quantity,
            custom_estimated_consumption_kwh,
            custom_usage_time_minutes,
            custom_nominal_power_w
        });

        res.status(201).json({appliance});
    } catch(err){
        next(err);
    }
};

const updateConstantAppliance = async (req, res, next) =>{
    try{
        const{
            custom_name,
            quantity,
            custom_estimated_consumption_kwh,
            custom_usage_time_minutes,
            custom_nominal_power_w
        } = req.body;

        const appliance = await applianceModel.updateConstant(
            req.params.id,
            req.user.id_user,
            {
                custom_name,
                quantity,
                custom_estimated_consumption_kwh,
                custom_usage_time_minutes,
                custom_nominal_power_w
            }
        );

        if(!appliance){
            return res.status(404).json({message: 'Appliance not found'});
        }

        res.status(200).json({appliance});
    } catch(err){
        next(err);
    }
};

const deleteConstantAppliance = async (req, res, next) =>{
    try{
        const deleted = await applianceModel.deleteConstant(req.params.id, req.user.id_user);
        
        if(!deleted){
            return res.status(404).json({message: 'Appliance not found'});
        }

        res.status(200).json({message: 'Appliance deleted successfully'});
    } catch(err){
        next(err);
    }
};

const getShiftableLoads = async (req, res, next) =>{
    try{
        const appliances = await applianceModel.getShiftableByUser(req.user.id_user);
        
        res.status(200).json({appliances});
    } catch(err){
        next(err);
    }
};

const addShiftableLoad = async (req, res, next) =>{
    try{
        const {
            id_catalog_appliance,
            custom_name,
            quantity,
            custom_estimated_consumption_kwh,
            custom_usage_time_minutes,
            custom_nominal_power_w,
            preferred_start_time,
            preferred_end_time,
            earliest_start_time,
            latest_end_time,
            is_interruptible,
            priority_level
        } = req.body;

        if(!id_catalog_appliance && !custom_name){
            return res.status(400).json({message: 'Either catalog appliance or custom name is required'});
        }

        if(id_catalog_appliance && custom_name){
            return res.status(400).json({message: 'Cannot have both catalog appliance and custom name'});
        }

        const appliance = await applianceModel.addShiftable(req.user.id_user,{
            id_catalog_appliance,
            custom_name,
            quantity,
            custom_estimated_consumption_kwh,
            custom_usage_time_minutes,
            custom_nominal_power_w,
            preferred_start_time,
            preferred_end_time,
            earliest_start_time,
            latest_end_time,
            is_interruptible,
            priority_level
        });

        res.status(201).json({appliance});
    } catch(err){
        next(err);
    }
};

const updateShiftableLoad = async (req, res, next) =>{
    try{
        const{
            custom_name,
            quantity,
            custom_estimated_consumption_kwh,
            custom_usage_time_minutes,
            custom_nominal_power_w,
            preferred_start_time,
            preferred_end_time,
            earliest_start_time,
            latest_end_time,
            is_interruptible,
            priority_level
        } = req.body;

        const appliance = await applianceModel.updateShiftable(
            req.params.id,
            req.user.id_user,
            {
                custom_name,
                quantity,
                custom_estimated_consumption_kwh,
                custom_usage_time_minutes,
                custom_nominal_power_w,
                preferred_start_time,
                preferred_end_time,
                earliest_start_time,
                latest_end_time,
                is_interruptible,
                priority_level
            }
        );

        if(!appliance){
            return res.status(404).json({message: 'Appliance not found'});
        }

        res.status(200).json({appliance});
    } catch(err){
        next(err);
    }
};

const deleteShiftableLoad = async (req, res, next) =>{
    try{
        const deleted = await applianceModel.deleteShiftable(req.params.id, req.user.id_user);
        
        if(!deleted){
            return res.status(404).json({message: 'Appliance not found'});
        }

        res.status(200).json({message: 'Appliance deleted successfully'});
    } catch(err){
        next(err);
    }
};

module.exports = {
    getCatalog,
    getCatalogById,
    getCategories,
    getConstantAppliances,
    addConstantAppliance,
    updateConstantAppliance,
    deleteConstantAppliance,
    getShiftableLoads,
    addShiftableLoad,
    updateShiftableLoad,
    deleteShiftableLoad
};