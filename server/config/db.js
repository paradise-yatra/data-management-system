import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

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

let recruitmentConnection;

export const getRecruitmentConnection = () => {
  if (recruitmentConnection) {
    return recruitmentConnection;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    return null;
  }

  try {
    recruitmentConnection = mongoose.createConnection(process.env.MONGODB_URI, {
      dbName: 'recruitment'
    });

    recruitmentConnection.on('connected', () => {
      console.log('Recruitment MongoDB Connected');
    });

    recruitmentConnection.on('error', (err) => {
      console.error('Recruitment MongoDB Connection Error:', err);
    });

    return recruitmentConnection;
  } catch (error) {
    console.error('Error creating recruitment DB connection:', error);
    return null;
  }
};

let voyaTrailConnection;

export const getVoyaTrailConnection = () => {
  if (voyaTrailConnection) {
    return voyaTrailConnection;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    return null;
  }

  try {
    voyaTrailConnection = mongoose.createConnection(process.env.MONGODB_URI, {
      dbName: 'Voya-Trail'
    });

    voyaTrailConnection.on('connected', () => {
      console.log('Voya-Trail MongoDB Connected');
    });

    voyaTrailConnection.on('error', (err) => {
      console.error('Voya-Trail MongoDB Connection Error:', err);
    });

    return voyaTrailConnection;
  } catch (error) {
    console.error('Error creating Voya-Trail DB connection:', error);
    return null;
  }
};

let rbacConnection;

export const getRbacConnection = () => {
  if (rbacConnection) {
    return rbacConnection;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    return null;
  }

  try {
    rbacConnection = mongoose.createConnection(process.env.MONGODB_URI, {
      dbName: 'RBAC'
    });

    rbacConnection.on('connected', () => {
      console.log('RBAC MongoDB Connected');
    });

    rbacConnection.on('error', (err) => {
      console.error('RBAC MongoDB Connection Error:', err);
    });

    return rbacConnection;
  } catch (error) {
    console.error('Error creating RBAC DB connection:', error);
    return null;
  }
};


