const mongoose = require('mongoose');

/**
 * Opens the shared MongoDB Atlas connection used by every model.
 * Called once from server.js before the HTTP listener starts.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy backend/.env.example to backend/.env first.');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000
  });

  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

module.exports = connectDB;
