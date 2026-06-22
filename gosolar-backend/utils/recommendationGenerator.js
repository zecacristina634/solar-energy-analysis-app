const systemModel = require('../models/systemModel');
const measurementModel = require('../models/measurementModel');
const applianceModel = require('../models/applianceModel');
const forecastModel = require('../models/forecastModel');
const recommendationModel = require('../models/recommendationModel');
const {calculateConstantConsumption} = require('./consumptionCalculator');
const {simulateMeasurement} = require('./solarSimulation');
const {generateSchedule} = require('./schedulingEngine');
const OpenAi = require('openai');

const client = new OpenAi({
    apiKey: process.env.OPENAI_API_KEY
});

const generateRecommendations = async (system, userId, force = false) =>{
    const systemId = system.id_system;

    const latestMeasurement = await measurementModel.getLastMeasurement(systemId);
    console.log(`[REC] systemId=${systemId} (${system.system_type}), latestMeasurement=`, latestMeasurement ? `power_w=${latestMeasurement.power_w}` : 'NULL');
    if(!latestMeasurement) return { error: 'No measurements found', recommendations: []};        

    const constantAppliances = await applianceModel.getConstantByUser(userId);
    const shiftableLoads = await applianceModel.getShiftableByUser(userId);
    const forecasts = await forecastModel.getWeeklyForecast(systemId);    
        
    const currentPowerW = parseFloat(latestMeasurement.power_w) || 0;
    const constantConsumptionW = calculateConstantConsumption(constantAppliances, 1) * 1000;
    const surplusW = currentPowerW - constantConsumptionW;

    const schedule = await generateSchedule(
        system,
        userId,
        applianceModel,
        measurementModel,
        constantConsumptionW
    );

    if(currentPowerW <= 0) return {error: 'System is not producing energy', recommendations: []}; 
    if(surplusW <= 0) return {error: 'No energy surplus available', recommendations: []};

    const currentHour = new Date().getHours();
    if(currentHour < 7 || currentHour >=20) return {error: 'Outside active hours', recommendations: []};

    if(!force){
        const recentRecommendations = await recommendationModel.getBySystem(systemId);
        if(recentRecommendations.length >0){
            const lastRec = recentRecommendations[0];
            const minutesSinceLast = (new Date()- new Date(lastRec.created_at))/(1000*60);
            if(minutesSinceLast <30) return {error: `Last generated ${Math.round(minutesSinceLast)} minutes ago`, recommendations:[]};
        }
    }

    if(shiftableLoads.length === 0) return {error: 'No shiftable loads configured', recommendations: []};
    
    const estimatedMeasurement = simulateMeasurement(new Date(), system, {
        temperature_c: parseFloat(latestMeasurement.temperature_c)||20,
        cloud_coverage: parseFloat(forecasts[0]?.cloud_coverage) ||0
    });

    const estimatedPowerW = estimatedMeasurement.power_w || 0;
    const performanceRatio = estimatedPowerW >0 ? currentPowerW/estimatedPowerW :1;
    const lowPerformance = performanceRatio <0.8;

    const constantAppliancesText = constantAppliances.length > 0
    ? constantAppliances.map(a => `- ${a.custom_name || a.catalog_name}: ${a.custom_nominal_power_w || a.catalog_power_w}W x${a.quantity}`).join('\n')
    : 'None configured';

    const shiftableLoadsText = shiftableLoads.length > 0
    ? shiftableLoads.map(a => `- ${a.custom_name || a.catalog_name}: ${a.custom_nominal_power_w || a.catalog_power_w}W x${a.quantity}, priority: ${a.priority_level}, preferred: ${a.preferred_start_time || 'N/A'}-${a.preferred_end_time || 'N/A'}`).join('\n')
    : 'None configured';

    const forecastText = forecasts.length > 0
    ? forecasts.map(f => `- ${new Date(f.forecast_date).toLocaleDateString()}: ${f.predicted_production_kwh} kWh predicted, ${f.cloud_coverage}% cloud coverage, ${f.temperature_c}°C`).join('\n')
    : 'No forecast available';

    const scheduleText = schedule.length > 0
    ? schedule.map(s => `- ${s.appliance_name} (${s.appliance_power_w}W): optimal start ${s.optimal_start}-${s.optimal_end}, saves ${s.savings_lei} lei, ${s.surplus_coverage_percent}% covered by solar${s.fully_covered ? ' ✓' : ' (partial)'}`).join('\n')
    : 'No optimal schedule calculated';

    const prompt = ` You are an energy management AI assistant for a solar photovoltaic system.
    Analyze the following data and generate actionable recommendations to optimize energy usage.
    SYSTEM DATA:
    - System name: ${system.system_name}
    - Peak power: ${system.peak_power_kwp} kWp
    - Panel orientation: ${system.panel_orientation || 'N/A'}
    - Tilt angle: ${system.tilt_angle_deg || 'N/A'}°
    CURRENT MEASUREMENTS:
    - Current production: ${currentPowerW.toFixed(2)}W
    - Constant consumption: ${constantConsumptionW.toFixed(2)}W
    - Energy surplus: ${surplusW.toFixed(2)}W
    - Panel temperature: ${latestMeasurement.temperature_c}°C
    - Performance ratio: ${(performanceRatio*100).toFixed(1)}% of expected 
    ${lowPerformance ? 'Warning: System performance is below 80% of expected output!' : ''}
    
    CONSTANT APPLIANCES (always running): 
    ${constantAppliancesText}
    SHIFTABLE LOADS (can be scheduled):
    ${shiftableLoadsText}
    7-DAY FORECAST:
    ${forecastText}
    OPTIMAL SCHEDULE (calculated by scheduling algorithm):
    ${scheduleText}
    Note: Use these calculated optimal times in your recommendations.
    Include specific start times in your messages.

    INSTRUCTIONS:
    1. Generate 1-3 specific, actionable recommendations — only the most relevant ones, do NOT pad to reach a higher count
    2. Consider current surplus, shiftable loads priorities and forecast data
    3. If performance low, include a system check recommendation
    4. Return ONLY a valid JSON object with this exact structure, no markdown, no extra text:
    {
        "recommendations":[
            {
                "recommendation_type": "shift_load|high_surplus|low_performance|forecast_based",
                "title": "Short title (max 150 chars)",
                "message": "Detailed message (max 300 chars)",
                "estimated_saving_kwh": number or null,
                "estimated_saving_money": number or null
            }
        ]
    }`;

    const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages:[
            {
                role: 'system',
                content: 'You are an energy management AI. Always respond with a valid JSON only, no markdown formatting.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content.trim();

    let parsedResponse;
    try{
        parsedResponse = JSON.parse(responseText);
    } catch(parseErr){
        console.error('[AI] Failed to parse OpenAi response: ', responseText);
        return {error: 'Failed to parse AI response', recommendations: []};
    }

    const savedRecommendations = [];
    for (const rec of parsedResponse.recommendations){
        const saved = await recommendationModel.create(
            userId,
            systemId,
            {
                recommendation_type: rec.recommendation_type,
                title: rec.title,
                message: rec.message,
                estimated_saving_kwh: rec.estimated_saving_kwh,
                estimated_saving_money: rec.estimated_saving_money
            }
        );
        savedRecommendations.push(saved);
    }

    console.log(`[AI] Generated ${savedRecommendations.length} recommendations for system ${systemId}`);
    return {
        recommendations: savedRecommendations,
        data: {
            current_power_w: currentPowerW,
            surplus_w: surplusW,
            performance_ratio: performanceRatio,
            low_performance: lowPerformance
        }
    };    
};

module.exports =  {generateRecommendations};