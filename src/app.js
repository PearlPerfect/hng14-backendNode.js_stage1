require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const profileRoutes = require('./routes/profile.routes');
const errorHandler = require('./middleware/errorHandler');
const pool = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Create table on first request, not at boot time
// let tableReady = false;
// app.use(async (req, res, next) => {
//   if (!tableReady) {
//     try {
//       await pool.query(`
//         CREATE TABLE IF NOT EXISTS profiles (
//           id TEXT PRIMARY KEY,
//           name TEXT UNIQUE NOT NULL,
//           gender TEXT,
//           gender_probability REAL,
//           sample_size INTEGER,
//           age INTEGER,
//           age_group TEXT,
//           country_id TEXT,
//           country_probability REAL,
//           created_at TEXT NOT NULL
//         )
//       `);
//       tableReady = true;
//     } catch (err) {
//       return next(err);
//     }
//   }
//   next();
// });

app.use('/api/profiles', profileRoutes);
app.use(errorHandler);

module.exports = app;