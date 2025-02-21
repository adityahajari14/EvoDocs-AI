const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    try {
      await mongoose.connect(process.env.MONGODB_URI, options);
    } catch (initialError) {
      console.log('Attempting connection with SSL settings...');
      options.ssl = true;
      options.tls = true;
      options.tlsAllowInvalidCertificates = true;
      await mongoose.connect(process.env.MONGODB_URI, options);
    }

    console.log('MongoDB Atlas Connected');
  } catch (err) {
    console.error('MongoDB connection error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    process.exit(1);
  }
};

module.exports = connectDB;
