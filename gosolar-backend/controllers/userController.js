const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const validatePassword = require('../utils/validatePassword');
const generateToken = require('../utils/generateToken');
const { get } = require('../routes/authRoutes');

const getProfile = async (req, res, next) =>{
    try{
        const user = await userModel.findById(req.user.id_user);
        if(!user){
            return res.status(404).json({message: 'User not found'});
        }

        res.status(200).json({ user })
    } catch(err){
        next(err);
    }
};

const updateProfile = async (req, res, next) =>{
    try{
        const {name, email} = req.body;
        if(!name || !email){
            return res.status(400).json({message: 'Name and email are required'});
        }

        const existingUser = await userModel.findByEmailExcludingId(email, req.user.id_user);
        if(existingUser){
            return res.status(409).json({message: 'Email already in use'});
        }

        const updatedUser = await userModel.updateProfile(req.user.id_user, name, email);
        if(!updatedUser){
            return res.status(404).json({message: 'User not found'});
        }

        const token = generateToken(updatedUser.id_user, updatedUser.email);
        res.status(200).json({ 
            token,
            user: updatedUser
        });
    } catch(err){
        next(err);
    }
};

const updatePassword = async (req, res, next) => {
    try{
        const {currentPassword, newPassword} = req.body;
        if(!currentPassword || !newPassword){
            return res.status(400).json({message: 'All fields are required'});
        }

        const passwordValidation = validatePassword(newPassword);
        if(!passwordValidation.isValid){
            return res.status(400).json({
                message: 'Invalid password',
                errors: passwordValidation.errors
            });
        }

        const user = await userModel.findByIdWithPassword(req.user.id_user);

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if(!isMatch){
            return res.status(401).json({message: 'Current password is incorrect'});
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await userModel.updatePassword(req.user.id_user, passwordHash);

        const token = generateToken(req.user.id_user, req.user.email);

        res.status(200).json({
            message: 'Password updated successfully',
            token
        });
    } catch(err){
        next(err);
    }
};

const deleteAccount = async (req, res, next) =>{
    try{
        const deleted = await userModel.deleteUser(req.user.id_user);

        if(!deleted){
            return res.status(404).json({message: 'User not found'});
        }

        res.status(200).json({message: 'Account deleted succesfully'});
    } catch(err){
        next(err);
    }
};

module.exports ={
    getProfile,
    updateProfile,
    updatePassword,
    deleteAccount
};