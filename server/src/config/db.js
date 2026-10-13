import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dayledger';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ [MongoDB Connected] Host: ${conn.connection.host}, Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ [MongoDB Connection Warning]: Could not reach ${uri}.`);
    console.warn(`   Reason: ${error.message}`);
    console.warn(`   Make sure your local MongoDB service is started (e.g. 'net start MongoDB' or 'mongod').`);
    return false;
  }
};
