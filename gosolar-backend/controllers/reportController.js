const PDFDocument = require('pdfkit');
const systemModel = require('../models/systemModel');
const measurementModel = require('../models/measurementModel');

const generateReport = async (req, res, next) =>{
    try{
        const {systemId, startDate, endDate, indicators} = req.body;
        if(!systemId || !startDate || !endDate){
            return res.status(400).json({message: 'System ID, start date and end date are required'});
        }

        const system = await systemModel.getById(systemId, req.user.id_user);
        if(!system){
            return res.status(404).json({message: 'System not found'});
        }

        let dailyProduction = [];
        let monthlyProduction = [];
        let energyVsConsumption = [];
        let summary = [];

        if(!indicators || indicators.includes('daily_production')){
            dailyProduction = await measurementModel.getDailyProduction(systemId, startDate, endDate);
        }

        if(!indicators || indicators.includes('monthly_production')){
            const year = new Date(startDate).getFullYear();
            monthlyProduction= await measurementModel.getMonthlyProduction(systemId, year);
        }

        if(!indicators || indicators.includes('energy_vs_consumption')){
            energyVsConsumption= await measurementModel.getEnergyVsConsumption(systemId, startDate, endDate);
        }

        if(!indicators || indicators.includes('summary')){
            summary = await measurementModel.getSummary(systemId, 'daily', startDate, endDate);
        }

        const doc = new PDFDocument({ margin: 50});
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=gosolar_report_${systemId}_${startDate.split('T')[0]}_${endDate.split('T')[0]}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(24).font('Helvetica-Bold').text('GoSolar - Energy Report', {align: 'center'});
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica')
            .text(`System: ${system.system_name || 'N/A'}`, {align: 'center'})
            .text(`Period: ${startDate.split('T')[0]} - ${endDate.split('T')[0]}`, { align: 'center' })
            .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        doc.fontSize(14).font('Helvetica-Bold').text('System Information');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica')
            .text(`System Name: ${system.system_name || 'N/A'}`)
            .text(`System Type: ${system.system_type}`)
            .text(`Peak Power: ${system.peak_power_kwp || 'N/A'} kWp`)
            .text(`Panel Orientation: ${system.panel_orientation || 'N/A'}`)
            .text(`Tilt Angle: ${system.tilt_angle_deg || 'N/A'}°`)
            .text(`Status: ${system.system_status}`);
        doc.moveDown(1);

        if(dailyProduction.length > 0){
            doc.fontSize(14).font('Helvetica-Bold').text('Daily Production');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica-Bold')
                .text('Date', 50, doc.y, { width: 200 })
                .text('Produced (kWh)', 250, doc.y - 12, { width: 200 });

            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.3);

            doc.font('Helvetica').fontSize(10);

            let totalProduced = 0;

            for (const row of dailyProduction) {
                const date = new Date(row.date).toLocaleDateString();
                const produced = parseFloat(row.produced_kwh || 0).toFixed(3);
                totalProduced += parseFloat(produced);

                doc
                    .text(date, 50, doc.y, { width: 200 })
                    .text(produced, 250, doc.y - 12, { width: 200 });

                doc.moveDown(0.3);
            }

            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.3);

            doc.font('Helvetica-Bold')
                .text('Total', 50, doc.y, { width: 200 })
                .text(totalProduced.toFixed(3), 250, doc.y - 12, { width: 200 });

            doc.moveDown(1.5);
        }

        if (monthlyProduction.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Monthly Production');
            doc.moveDown(0.5);

            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            doc.fontSize(10).font('Helvetica-Bold')
                .text('Month', 50, doc.y, { width: 200 })
                .text('Produced (kWh)', 250, doc.y - 12, { width: 200 });

            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.3);

            doc.font('Helvetica').fontSize(10);

            for (const row of monthlyProduction) {
                const monthName = monthNames[new Date(row.month).getMonth()];
                const produced = parseFloat(row.produced_kwh || 0).toFixed(3);

                doc
                    .text(monthName, 50, doc.y, { width: 200 })
                    .text(produced, 250, doc.y - 12, { width: 200 });

                doc.moveDown(0.3);
            }

            doc.moveDown(1.5);
        }
    
        if (energyVsConsumption.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Hourly Production');
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica-Bold')
                .text('Hour', 50, doc.y, { width: 200 })
                .text('Produced (kWh)', 250, doc.y - 12, { width: 200 });

            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.3);

            doc.font('Helvetica').fontSize(10);

            for (const row of energyVsConsumption) {
                const hour = new Date(row.hour).toLocaleString();
                const produced = parseFloat(row.produced_kwh || 0).toFixed(3);

                doc
                    .text(hour, 50, doc.y, { width: 200 })
                    .text(produced, 250, doc.y - 12, { width: 200 });

                doc.moveDown(0.3);
            }

            doc.moveDown(1.5);
        }

        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica')
            .text('Generated by GoSolar App', { align: 'center' })
            .text(`${new Date().toLocaleString()}`, { align: 'center' });

        doc.end();

    } catch(err){
        next(err);
    }
};

module.exports = {generateReport};