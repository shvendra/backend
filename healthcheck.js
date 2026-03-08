#!/usr/bin/env node

// 🏥 Docker Health Check Script
import http from 'http';

const options = {
  host: 'localhost',
  port: process.env.PORT || 8000,
  path: '/api/v1/monitoring/live',
  timeout: 5000,
  method: 'GET'
};

const request = http.request(options, (response) => {
  console.log(`Health check status: ${response.statusCode}`);
  
  if (response.statusCode === 200) {
    process.exit(0); // Healthy
  } else {
    process.exit(1); // Unhealthy
  }
});

request.on('timeout', () => {
  console.error('Health check timeout');
  process.exit(1);
});

request.on('error', (error) => {
  console.error('Health check error:', error.message);
  process.exit(1);
});

request.end();