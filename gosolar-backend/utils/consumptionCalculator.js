const calculateConstantConsumption = (appliances, durationHours) =>{
    const totalDailyKwh = appliances.reduce((sum, appliance) =>{
        const consumption = parseFloat(
            appliance.custom_estimated_consumption_kwh || 
            appliance.catalog_consumption_kwh || 0
        );
        const quantity = appliance.quantity || 1;
        return sum + (consumption * quantity);
    }, 0);
    
    return totalDailyKwh * (durationHours / 24);
};

const calculateFlexibleConsumption =(appliances) =>{
    return appliances.reduce((sum, appliance) => {
        const consumption = parseFloat(
            appliance.custom_estimated_consumption_kwh ||
            appliance.catalog_consumption_kwh || 0
        );
        const quantity =appliance.quantity || 1;
        return sum + (consumption * quantity);
    }, 0);
};

module.exports = {
    calculateConstantConsumption,
    calculateFlexibleConsumption
};