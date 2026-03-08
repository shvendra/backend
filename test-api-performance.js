#!/usr/bin/env node

import axios from 'axios';

// API Performance Testing Script
const API_BASE_URL = 'https://bookmyworkers.com';
const API_ENDPOINTS = [
  '/api/v1/user/getuser',
  '/api/v1/job/getall',
  '/api/v1/application/getall',
  '/api/v1/blogs',
  '/landing',
  '/',
];

const performanceTest = async () => {
  console.log('🚀 Starting API Performance Test');
  console.log('==================================');
  console.log(`Testing: ${API_BASE_URL}`);
  console.log('');

  const results = [];

  for (const endpoint of API_ENDPOINTS) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`📊 Testing: ${endpoint}`);

      // Measure multiple requests
      const times = [];
      const REQUESTS = 5;

      for (let i = 0; i < REQUESTS; i++) {
        const startTime = performance.now();
        
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'MyWorkerWebView/1.0 Performance Test',
              'Accept': 'application/json, text/html',
              'Connection': 'keep-alive'
            }
          });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          times.push({
            time: responseTime,
            status: response.status,
            size: JSON.stringify(response.data).length,
          });
          
        } catch (error) {
          const endTime = performance.now();
          times.push({
            time: endTime - startTime,
            status: error.response?.status || 'ERROR',
            error: error.message
          });
        }
      }

      // Calculate statistics
      const validTimes = times.filter(t => !t.error).map(t => t.time);
      const avgTime = validTimes.length > 0 ? 
        (validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : 0;
      const minTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
      const maxTime = validTimes.length > 0 ? Math.max(...validTimes) : 0;
      
      const result = {
        endpoint,
        avgTime: Math.round(avgTime),
        minTime: Math.round(minTime),
        maxTime: Math.round(maxTime),
        successRate: (validTimes.length / REQUESTS) * 100,
        avgSize: times[0]?.size || 0
      };
      
      results.push(result);

      // Color coding for response times
      const getTimeColor = (time) => {
        if (time < 200) return '🟢'; // Excellent
        if (time < 500) return '🟡'; // Good
        if (time < 1000) return '🟠'; // Acceptable
        return '🔴'; // Needs optimization
      };

      console.log(`   ${getTimeColor(avgTime)} Avg: ${avgTime}ms | Min: ${minTime}ms | Max: ${maxTime}ms | Success: ${result.successRate}%`);
      
    } catch (error) {
      console.log(`   🔴 FAILED: ${error.message}`);
    }
    
    console.log('');
  }

  // Summary Report
  console.log('📋 PERFORMANCE SUMMARY');
  console.log('=====================');
  
  const overallAvg = Math.round(
    results.reduce((sum, r) => sum + r.avgTime, 0) / results.length
  );
  
  console.log(`🎯 Overall Average Response Time: ${overallAvg}ms`);
  
  // Recommendations
  const slowEndpoints = results.filter(r => r.avgTime > 1000);
  const fastEndpoints = results.filter(r => r.avgTime < 200);
  
  if (slowEndpoints.length > 0) {
    console.log(`🔴 Slow endpoints (>1s): ${slowEndpoints.map(e => e.endpoint).join(', ')}`);
  }
  
  if (fastEndpoints.length > 0) {
    console.log(`🟢 Fast endpoints (<200ms): ${fastEndpoints.map(e => e.endpoint).join(', ')}`);
  }
  
  // Performance recommendations
  console.log('');
  console.log('💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('=================================');
  
  if (overallAvg > 500) {
    console.log('• Consider adding Redis caching for database queries');
    console.log('• Optimize database indexes');
    console.log('• Enable gzip compression');
    console.log('• Consider CDN for static assets');
  }
  
  if (overallAvg > 1000) {
    console.log('• 🚨 CRITICAL: Response times are too high for mobile users');
    console.log('• Database queries need immediate optimization');
    console.log('• Consider horizontal scaling');
  }
  
  return results;
};

// Run the test
performanceTest().catch(console.error);