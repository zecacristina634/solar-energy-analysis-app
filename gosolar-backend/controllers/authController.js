const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const validatePassword = require('../utils/validatePassword');

const register = async (req, res, next) =>{
    try{
        const {name, email, password} = req.body;

        if(!name || !email || !password){
            return res.status(400).json({message: 'All fields are required'});
        }

        const passwordValidation = validatePassword(password);
        if(!passwordValidation.isValid){
            return res.status(400).json({
                message: 'Invalid password',
                errors: passwordValidation.errors
            });
        }

        const existingUser = await userModel.findByEmail(email);
        if(existingUser){
            return res.status(409).json({message: 'Email already in use'});
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await userModel.create(name, email, passwordHash);

        const token = generateToken(user.id_user, user.email);

        res.status(201).json({
            token,
            user: {
                id_user: user.id_user,
                name: user.name,
                email: user.email,
                created_at: user.created_at
            }
        });
    } catch (err){
        next(err);
    }
};

const login = async (req, res, next) =>{
    try{
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({message: 'All fields are required'});
        }

        const user = await userModel.findByEmail(email);
        if(!user){
            return res.status(401).json({message: 'Invalid credentials'});
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if(!isMatch){
            return res.status(401).json({message: 'Invalid credentials'});
        }

        const token = generateToken(user.id_user, user.email);

        res.status(200).json({
            token,
            user: {
                id_user: user.id_user,
                name: user.name,
                email: user.email,
                created_at: user.created_at
            }
        });
    } catch (err){
        next(err);
    }
};

module.exports = {register, login};