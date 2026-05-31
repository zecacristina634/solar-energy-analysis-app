const TARIF_LEI = 0.80; // lei/kWh

const getHourlyProduction = async (systemId, measurementModel) =>{
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const measurements = await measurementModel.getHistoryByPerior(
        systemId,
        startOfDay,
        endOfDay
    );

    const hourlyData = {};
    for (let h=0; h < 24; h++){
        hourlyData[h] = {totalPower: 0, count: 0, avgPower: 0};
    }

    for (const m of measurements){
        const hour = new Date(m.recorded_at).getHours();
        if(m.power_w){
            hourlyData[hour].totalPower += parseFloat(m.power_w);
            hourlyData[hour].count ++;
        }
    }

    for (let h=0; h<24; h++){
        if(hourlyData[h].count > 0){
            hourlyData[h].avgPower = hourlyData[h].totalPower / hourlyData[h].count;
        }
    }

    return hourlyData;
};

const getHourlySurplus = (hourlyProduction,  constantConsumptionW) =>{
    const hourlySurplus = {};
    for (let h=0; h<24; h++){
        hourlySurplus[h] = Math.max(
            0,
            hourlyProduction[h].avgPower - constantConsumptionW
        );
    }

    return hourlySurplus;
};

const findOptimalStartTime = (appliance, hourlySurplus, prefferedStart, prefferedEnd) =>{
    const appliancePowerW = parseFloat(
        appliance.custom_nominal_power_w || appliance.catalog_power_w || 0
    );
    const durationHours = Math.ceil(
        (appliance.custom_usage_time_minutes || appliance.catalog_usage_time || 60)/60
    );

    const startHour = prefferedStart ? parseInt(prefferedStart.split(':')[0]) : 7;
    const endHour = prefferedEnd ? parseInt(prefferedEnd.split(':')[0]) : 20;


    let bestStartHour = null;
    let bestSurplus = -1;

    for(let h=startHour; h<= endHour - durationHours; h++){
        let minSurplusInWindow = Infinity;
        let totalSurplusInWindow = 0;

        for (let d =0; d<= durationHours; d++){
            const hourSurplus = hourlySurplus[h+d] || 0;
            minSurplusInWindow = Math.min(minSurplusInWindow, hourSurplus);
            totalSurplusInWindow += hourSurplus;
        }

        if(minSurplusInWindow >= appliancePowerW && totalSurplusInWindow > bestSurplus) {
            bestSurplus =  totalSurplusInWindow;
            bestStartHour = h;
        }
    }

    if (bestStartHour === null){
        for (let h= startHour; h <= endHour - durationHours; h++){
            let totalSurplus = 0;
            for(let d =0; d< durationHours; d++){
                totalSurplus += hourlySurplus[h+d] || 0;
            }
            if(totalSurplus > bestSurplus){
                bestSurplus = totalSurplus;
                bestStartHour = h;
            }
        }
    }

    if (bestStartHour === null) 
        return null;

    const endHourCalc = bestStartHour + durationHours;
    const energyKwh = (appliancePowerW * durationHours)/1000;
    const savingsLei = energyKwh * TARIF_LEI;
    const coveragePercent = Math.min(
        100, 
        Math.round((bestSurplus/(appliancePowerW * durationHours))* 100)
    );

    return {
        appliance_name: appliance.custom_name || appliance.catalog_name,
        appliance_power_w: appliancePowerW,
        optimal_start: `${String(bestStartHour).padStart(2, '0')}:00`,
        optimal_end: `${String(endHourCalc).padStart(2, '0')}:00`,
        durationHours: durationHours,
        energy_kwh: parseFloat(energyKwh.toFixed(3)),
        savings_lei: parseFloat(savingsLei.toFixed(2)),
        surplus_coverage_percent: coveragePercent,
        fully_covered: coveragePercent >=100
    };
};

const generateSchedule = async (system, userId, applianceModel, measurementModel, constantConsumptionW) =>{
    try{
        const shiftableLoads = await applianceModel.getShiftableByUser(userId);
        if (shiftableLoads.length === 0)
            return [];

        const hourlyProduction = await getHourlyProduction(system.id_system, measurementModel);
        const hourlySurplus = getHourlySurplus(hourlyProduction, constantConsumptionW);

        const schedule = [];

        for(const appliance of shiftableLoads){
            const result = findOptimalStartTime(
                appliance,
                hourlySurplus,
                appliance.preffered_start_time,
                appliance.preffered_end_time
            );

            if(result){
                schedule.push({
                    ...result,
                    priority_level: appliance.priority_level
                });
            }
        }

        schedule.sort((a,b)=>{
            const priorityOrder = {high: 0, medium: 1, low: 2};
            const pA = priorityOrder[a.priority_level] ?? 1;
            const pB = priorityOrder[b.priority_level] ?? 1;
            if(pA !== pB)
                return pA - pB;
            return a.optimal_start.localeCompare(b.optimal_start);
        });

        return schedule;
    }catch(err){
        console.error('[SCHEDULING ENGINE] Error:', err.message);
        return [];
    }
};

module.exports = {generateSchedule};