const express = require('express');
const dotenv =require('dotenv');

const cors = require('cors');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const systemRoutes = require('./routes/systemRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const applianceRoutes = require('./routes/applianceRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const reportRoutes = require('./routes/reportRoutes');

const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/systems', systemRoutes);
app.use('/measurements', measurementRoutes);
app.use('/appliances', applianceRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/forecast', forecastRoutes);
app.use('/reports', reportRoutes);

app.get('/', (req,res)=>{
    res.json({message: 'GoSolar API is running'});
});

app.use(errorMiddleware);

module.exports=app;