import cluster from 'cluster';
import os from 'os';
import app from "./app.js";
import { config } from 'dotenv';

config();

// ✅ PRODUCTION SERVER CONFIGURATION
const PORT = process.env.PORT || 8000;
const WORKERS = process.env.WORKERS || os.cpus().length;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ✅ CLUSTERING FOR PRODUCTION PERFORMANCE
if (NODE_ENV === 'production' && cluster.isPrimary && process.env.ENABLE_CLUSTERING === 'true') {
  console.log(`🚀 Master process ${process.pid} starting...`);
  console.log(`📊 Spawning ${WORKERS} worker processes`);
  
  // Fork workers
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }
  
  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} died. Spawning new worker...`);
    cluster.fork();
  });
  
  // Graceful shutdown for all workers
  process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received. Shutting down workers gracefully...');
    for (const worker of Object.values(cluster.workers)) {
      worker.disconnect();
    }
  });
  
} else {
  // ✅ WORKER PROCESS OR DEVELOPMENT MODE
  const server = app.listen(PORT, '0.0.0.0', () => {
    const processType = cluster.isWorker ? `Worker ${process.pid}` : 'Server';
    console.log(`✅ ${processType} running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🕰 Started at: ${new Date().toISOString()}`);
    
    if (NODE_ENV === 'production') {
      console.log(`📊 Process ID: ${process.pid}`);
      console.log(`📋 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }
  });
  
  // ✅ PRODUCTION ERROR HANDLING
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error(`❌ Server error:`, error);
    }
    process.exit(1);
  });
  
  // ✅ GRACEFUL SHUTDOWN HANDLING
  const gracefulShutdown = (signal) => {
    console.log(`📴 ${signal} received. Starting graceful shutdown...`);
    
    server.close((error) => {
      if (error) {
        console.error(`❌ Error during server shutdown:`, error);
        process.exit(1);
      }
      
      console.log(`✅ HTTP server closed successfully`);
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error(`❌ Forced shutdown after 30s timeout`);
      process.exit(1);
    }, 30000);
  };
  
  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // ✅ UNCAUGHT EXCEPTION HANDLING
  process.on('uncaughtException', (error) => {
    console.error(`❌ Uncaught Exception:`, error);
    console.error(`Stack:`, error.stack);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error(`❌ Unhandled Rejection at:`, promise);
    console.error(`Reason:`, reason);
    // Don't exit in production for unhandled rejections - just log
    if (NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
  
  // ✅ MEMORY MONITORING IN PRODUCTION
  if (NODE_ENV === 'production') {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      // Log memory usage every 30 minutes
      console.log(`📋 Memory Usage: ${memoryMB}MB (Heap: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB)`);
      
      // Warn if memory usage is high
      if (memoryMB > 500) {
        console.warn(`⚠️ High memory usage detected: ${memoryMB}MB`);
      }
    }, 30 * 60 * 1000); // Every 30 minutes
  }
}
