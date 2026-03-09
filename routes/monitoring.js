import express from 'express';
import mongoose from 'mongoose';
import os from 'os';
import { getCacheStats, isRedisConnected } from '../middlewares/cache.js';

const router = express.Router();

// ✅ DETAILED HEALTH CHECK ENDPOINT
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Database health check
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Cache health check
    let cacheStats;
    try {
      cacheStats = await getCacheStats();
    } catch (error) {
      cacheStats = { connected: false, error: error.message };
    }
    
    // System health metrics
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Service health
      services: {
        database: {
          status: dbStatus === 1 ? 'healthy' : 'unhealthy',
          state: dbStates[dbStatus] || 'unknown',
          host: process.env.DB_URL ? 'configured' : 'not configured'
        },
        cache: {
          status: cacheStats.connected ? 'healthy' : 'unavailable',
          connected: cacheStats.connected,
          keys: cacheStats.totalKeys || 0
        }
      },
      
      // System metrics
      system: {
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
          used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          platform: os.platform(),
          arch: os.arch(),
          cores: os.cpus().length,
          loadAvg: os.loadavg()
        }
      },
      
      // Process info
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        memoryUsage: memUsage
      }
    };
    
    // Determine overall health status
    const isHealthy = dbStatus === 1;
    const statusCode = isHealthy ? 200 : 503;
    
    if (!isHealthy) {
      healthData.status = 'unhealthy';
      healthData.issues = [];
      
      if (dbStatus !== 1) {
        healthData.issues.push('Database connection issue');
      }
    }
    
    res.status(statusCode).json(healthData);
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ SIMPLE READINESS CHECK
router.get('/ready', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  
  if (dbReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      reason: 'Database not connected',
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ SIMPLE LIVENESS CHECK
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ PERFORMANCE METRICS ENDPOINT
router.get('/metrics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();
    
    // Cache statistics
    const cacheStats = await getCacheStats();
    
    // Database connection pool stats (if available)
    const dbStats = {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: uptime,
      
      // Memory metrics in MB
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
      },
      
      // CPU metrics
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: os.loadavg()
      },
      
      // System info  
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024)
      },
      
      // Database metrics
      database: dbStats,
      
      // Cache metrics
      cache: cacheStats,
      
      // Process info
      process: {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        argv: process.argv.slice(2) // Hide node path and script path
      }
    };
    
    res.json(metrics);
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ CACHE MANAGEMENT ENDPOINTS
router.post('/cache/clear', async (req, res) => {
  try {
    const { invalidateCache } = await import('../middlewares/cache.js');
    const pattern = req.body.pattern || '*';
    
    const result = await invalidateCache(pattern);
    
    res.json({
      success: true,
      message: result ? 'Cache cleared successfully' : 'No cache entries to clear',
      pattern: pattern,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache stats',
      message: error.message
    });
  }
});

export default router;