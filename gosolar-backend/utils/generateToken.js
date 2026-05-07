const jwt = require('jsonwebtoken');

const generateToken = (userId, email) =>{
    return jwt.sign(
        {
            id_user: userId, 
            email: email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = generateToken;