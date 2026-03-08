import redis from 'redis';
import { config } from 'dotenv';

config();

// ✅ PRODUCTION-READY REDIS SETUP
let redisClient;
let isRedisConnected = false;

const initializeRedis = async () => {
  // ✅ Skip Redis initialization if not configured
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('⚠️  No Redis configuration found. Running without cache.');
    isRedisConnected = false;
    return;
  }

  try {
    // Production Redis configuration
    const redisConfig = {
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis max reconnection attempts reached');
            return false; // Stop reconnecting
          }
          return Math.min(retries * 100, 2000);
        }
      },
      database: process.env.REDIS_DB || 0
    };

    // Use URL or host/port configuration
    if (process.env.REDIS_URL) {
      redisConfig.url = process.env.REDIS_URL;
    } else {
      redisConfig.socket.host = process.env.REDIS_HOST || 'localhost';
      redisConfig.socket.port = process.env.REDIS_PORT || 6379;
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }
    }

    redisClient = redis.createClient(redisConfig);

    redisClient.on('connect', () => {
      console.log('🔄 Connecting to Redis...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis client error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('end', () => {
      console.log('📴 Redis connection closed');
      isRedisConnected = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
      isRedisConnected = false;
    });

    // ✅ Try to connect with timeout
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error.message);
    console.log('⚠️  Continuing without Redis cache...');
    isRedisConnected = false;
    redisClient = null;
  }
};

// ✅ SMART CACHE MIDDLEWARE WITH FALLBACK
const cache = (duration = 300) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if Redis is not available
    if (!isRedisConnected || !redisClient) {
      res.setHeader('X-Cache', 'DISABLED');
      return next();
    }

    const cacheKey = `cache:${req.originalUrl || req.url}`;
    
    try {
      // Try to get from cache
      const cachedResult = await redisClient.get(cacheKey);
      
      if (cachedResult) {
        console.log('📦 Cache HIT for:', req.originalUrl);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', await redisClient.ttl(cacheKey));
        return res.json(JSON.parse(cachedResult));
      }
      
      // Cache MISS - modify res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache asynchronously to avoid blocking response
          redisClient.setEx(cacheKey, duration, JSON.stringify(data))
            .then(() => {
              console.log('💾 Cached response for:', req.originalUrl);
            })
            .catch((error) => {
              console.error('⚠️  Cache write error:', error.message);
            });
        }
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.error('⚠️  Cache read error:', error.message);
      res.setHeader('X-Cache', 'ERROR');
      next();
    }
  };
};

// ✅ CACHE INVALIDATION UTILITIES
const invalidateCache = async (pattern = '*') => {
  if (!isRedisConnected || !redisClient) {
    return false;
  }
  
  try {
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️  Invalidated ${keys.length} cache entries`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Cache invalidation error:', error);
    return false;
  }
};

// ✅ CACHE STATISTICS
const getCacheStats = async () => {
  if (!isRedisConnected || !redisClient) {
    return { connected: false };
  }
  
  try {
    const info = await redisClient.info('memory');
    const keys = await redisClient.keys('cache:*');
    
    return {
      connected: isRedisConnected,
      totalKeys: keys.length,
      memoryInfo: info,
      uptime: await redisClient.info('server')
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

// ✅ GRACEFUL SHUTDOWN
const closeRedis = async () => {
  if (redisClient && isRedisConnected) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis:', error);
    }
  }
};

// Initialize Redis on module load
initializeRedis();

export { 
  cache, 
  invalidateCache, 
  getCacheStats, 
  closeRedis,
  isRedisConnected 
};