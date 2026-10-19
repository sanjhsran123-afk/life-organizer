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
    const isAtlas = uri.includes('mongodb+srv');
    const safeTarget = isAtlas ? 'MongoDB Atlas Cluster' : 'mongodb://localhost:27017/dayledger';
    console.warn(`⚠️ [MongoDB Connection Warning]: Could not reach ${safeTarget}.`);
    console.warn(`   Reason: ${error.message}`);
    console.warn(`   Verify MongoDB Atlas network access (hosting provider's approved IPs or private connection) or local MongoDB service.`);
    return false;
  }
};
