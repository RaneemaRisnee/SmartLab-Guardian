const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();


const app = express();

// MIDDLEWARE MUST COME BEFORE ROUTES!
app.use(cors());
app.use(express.json()); // <--- Crucial line to parse JSON body
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/usage', require('./src/routes/usageRoutes'));

// Test Root Route
app.get('/', (req, res) => {
  res.send('SmartLab Guardian API is running...');
});

// Database Connection & Server Start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartlab_guardian';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });