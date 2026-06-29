/* =====================================================
   MongoDB Connection Configuration
   ===================================================== */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const {
  MONGODB_URI,
  DB_HOST = 'localhost',
  DB_PORT = '27017',
  DB_NAME = 'bloo-crm',
  DB_USER,
  DB_PASSWORD,
  DB_AUTH_SOURCE = 'admin'
} = process.env;

const buildConnectionString = () => {
  if (MONGODB_URI) {
    return MONGODB_URI;
  }

  if (DB_USER && DB_PASSWORD) {
    const encodedUser = encodeURIComponent(DB_USER);
    const encodedPassword = encodeURIComponent(DB_PASSWORD);
    return `mongodb://${encodedUser}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=${DB_AUTH_SOURCE}`;
  }

  return `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
};

const connectDB = async () => {
  const uri = buildConnectionString();

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB connected to ${DB_NAME}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
