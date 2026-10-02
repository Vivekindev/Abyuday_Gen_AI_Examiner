import mongoose from 'mongoose';
import { initializeMonitoring } from '../functions/telemetry.js';

let connectionPromise;

export default async function connectDB() {
  if (mongoose.connection.readyState === 1) { await initializeMonitoring(); return mongoose.connection; }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .catch((error) => { connectionPromise = undefined; throw error; });
  }
  await connectionPromise;
  await initializeMonitoring();
  return mongoose.connection;
}
