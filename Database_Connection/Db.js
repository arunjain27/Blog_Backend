const mongoose = require('mongoose');

// Cache connection globally
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function Database_Connection() {
  // Return existing connection if available
  if (cached.conn) {
    console.log("Using cached database connection");
    return cached.conn;
  }

  // If no connection promise exists, create one
  if (!cached.promise) {
    const BASE_URL = process.env.BASE_URL;
    
    if (!BASE_URL) {
      throw new Error("BASE_URL is not defined in environment variables");
    }

    const opts = {
      bufferCommands: false, // Critical for serverless
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    console.log("Creating new database connection...");
    
    cached.promise = mongoose.connect(BASE_URL, opts)
      .then((mongoose) => {
        console.log("✅ Database Connected Successfully");
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ Database Connection Failed:", err.message);
        cached.promise = null; // Reset on failure
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = Database_Connection;