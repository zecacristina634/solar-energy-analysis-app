const validatePassword = (password) =>{
    const errors = [];

    if(password.lenght < 8){
        errors.push('Password must be at least 8 characters');
    }

    if(!/\d/.test(password)){
        errors.push('Password must contain at least one number');
    }

    if(!/[a-zA-Z]/.test(password)){
        errors.push('Password must contain at least one letter');
    }
    
    return{
        isValid: errors.length === 0,
        errors
    };
};

module.exports = validatePassword;