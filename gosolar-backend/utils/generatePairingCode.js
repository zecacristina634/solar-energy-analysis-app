const generatePairingCode = () =>{
    const characters= 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codeLenght = 6;
    let code = '';

    for(let i = 0; i< codeLenght; i++){
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
};

module.exports = generatePairingCode;