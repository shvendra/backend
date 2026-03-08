import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ✅ PRODUCTION-READY DATABASE CONNECTION
const dbConnection = async () => {
  try {
    // ✅ PRODUCTION CONNECTION SETTINGS (Fixed compatibility)
    const options = {
      dbName: process.env.DATABASE,
      
      // Connection pool settings for production
      maxPoolSize: 50, // Maintain up to 50 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      
      // Performance optimizations
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      minPoolSize: 5, // Maintain minimum 5 connections
      
      // Reliability settings
      retryWrites: true,
      w: 'majority',
      
      // Compression for better performance (optional)
      compressors: ['zlib']
    };
    
    // ✅ Set Mongoose-specific settings separately
    mongoose.set('bufferCommands', false); // Disable mongoose buffering

    // Connect to MongoDB
    await mongoose.connect(process.env.DB_URL, options);
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Database: ${process.env.DATABASE}`);
    console.log(`🔗 Connection Pool: Min ${options.minPoolSize}, Max ${options.maxPoolSize}`);
    
    // ✅ CONNECTION EVENT HANDLERS
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully!');
    });

    // ✅ GRACEFUL SHUTDOWN HANDLING
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('📴 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during database shutdown:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error(`❌ Failed to connect to MongoDB: ${error.message}`);
    
    // ✅ RETRY LOGIC FOR PRODUCTION
    setTimeout(() => {
      console.log('🔄 Retrying database connection...');
      dbConnection();
    }, 5000);
  }
};

export default dbConnection;
