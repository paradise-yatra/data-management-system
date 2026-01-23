import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not defined in .env file');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.error('Server will continue to run, but database operations will fail.');
    // Don't exit - let the server start even if DB connection fails
  }
};

