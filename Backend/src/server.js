require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing. Create Backend/.env (copy .env.example), e.g. MONGO_URI=mongodb://127.0.0.1:27017/smartlab');
  process.exit(1);
}
if (!process.env.AGENT_KEY) {
  console.warn('WARNING: AGENT_KEY is not set - anyone can POST alerts. Set it in Backend/.env');
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error('Is MongoDB running? (Windows: Services -> MongoDB Server -> Start, or open MongoDB Compass and connect)');
    process.exit(1);
  });
