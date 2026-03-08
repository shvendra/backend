// 🚀 PM2 Production Configuration
module.exports = {
  apps: [
    {
      name: 'bookmyworkers-backend',
      script: './server.js',

      instances: 'max',
      exec_mode: 'cluster',

      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },

      node_args: '--max-old-space-size=2048',

      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      max_memory_restart: '1G',

      kill_timeout: 5000,
      listen_timeout: 8000,
      reload_delay: 1000,

      instance_var: 'INSTANCE_ID',
      combine_logs: true
    }
  ]
};
