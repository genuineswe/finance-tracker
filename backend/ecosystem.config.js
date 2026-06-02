module.exports = {
  apps: [
    {
      name: 'finance-tracker-api',
      script: 'app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_EC2_IP_ADDRESS', // Replace with your EC2 IP
      ref: 'origin/main',
      repo: 'git@github.com:genuineswe/finance-tracker.git',
      path: '/home/ubuntu/finance-tracker',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
