require('dotenv').config();
const express = require('express');
const path = require('path'); 
const cors = require('cors');
const profileRoutes = require('./routes/profile.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/profiles', profileRoutes);

app.use(errorHandler);

module.exports = app;