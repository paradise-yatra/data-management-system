# Deployment Guide for Hostinger VPS

## Prerequisites

Before starting, ensure you have:
- Node.js (v18 or higher) installed
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed and configured
- MongoDB connection string ready
- Subdomain DNS pointing to your VPS IP

## Step 1: Transfer Files to Server

If you haven't already, transfer your project files to the server:

```bash
# From your local machine, use SCP or SFTP to transfer files
# Or clone from Git if you have a repository
cd /var/www/paradise-yatra-data-management-system
git clone <your-repo-url> .
```

## Step 2: Install Dependencies

```bash
cd /var/www/paradise-yatra-data-management-system
npm install --production=false
```

## Step 3: Create Production .env File

Create a `.env` file in the root directory:

```bash
nano .env
```

Add the following (replace with your actual values):

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://dikshusharma11:dikshant1140@cluster0.w6ybkdx.mongodb.net/Identity-Management-System

# Server Port (use a different port if 3001 is taken)
PORT=3001

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Frontend URL (your subdomain)
FRONTEND_URL=https://data.paradiseyatra.com

# Node Environment
NODE_ENV=production

# Admin Credentials (optional, for initial admin creation)
ADMIN_EMAIL=admin@paradiseyatra.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Admin User
```

**Important**: Generate a strong JWT_SECRET:
```bash
openssl rand -base64 32
```

## Step 4: Create Admin User

```bash
npm run create:admin
```

This will create the initial admin user.

## Step 5: Build Frontend

```bash
npm run build
```

This creates a `dist` folder with the production build.

## Step 6: Update Server Configuration for Production

We need to update the server to serve the built frontend files. Create or update `server/index.js` to serve static files in production.

## Step 7: Set Up PM2 for Backend

Create a PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [{
    name: 'identity-management-api',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

Start with PM2:

```bash
# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

## Step 8: Configure Nginx for Subdomain

Create Nginx configuration for your subdomain:

```bash
sudo nano /etc/nginx/sites-available/data.paradiseyatra.com
```

Add the following (replace `data.paradiseyatra.com` with your subdomain):

```nginx
server {
    listen 80;
    server_name data.paradiseyatra.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For now, allow HTTP (remove after SSL setup)
    root /var/www/paradise-yatra-data-management-system/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/data.paradiseyatra.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 9: Set Up SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d data.paradiseyatra.com
```

After SSL setup, update the Nginx config to redirect HTTP to HTTPS (uncomment the redirect line).

## Step 10: Update Server to Serve Static Files

We need to update the server to serve the built frontend in production. The server should:
- Serve static files from `dist` folder in production
- Only run API in development

## Step 11: Test the Deployment

1. Visit your subdomain: `https://data.paradiseyatra.com`
2. Try logging in with admin credentials
3. Check PM2 status: `pm2 status`
4. Check logs: `pm2 logs identity-management-api`

## Useful Commands

```bash
# PM2 Commands
pm2 status                    # Check status
pm2 logs identity-management-api  # View logs
pm2 restart identity-management-api  # Restart
pm2 stop identity-management-api    # Stop
pm2 delete identity-management-api  # Remove

# Nginx Commands
sudo nginx -t              # Test configuration
sudo systemctl reload nginx  # Reload Nginx
sudo systemctl status nginx  # Check status

# View Logs
tail -f logs/pm2-out.log   # Application logs
tail -f logs/pm2-error.log # Error logs
```

## Troubleshooting

1. **Port already in use**: Change PORT in .env and update Nginx proxy_pass
2. **MongoDB connection fails**: Check MONGODB_URI in .env
3. **Static files not serving**: Check Nginx root path and file permissions
4. **API not working**: Check PM2 status and logs
5. **CORS errors**: Verify FRONTEND_URL in .env matches your domain

## File Permissions

Ensure proper permissions:

```bash
sudo chown -R $USER:$USER /var/www/paradise-yatra-data-management-system
chmod -R 755 /var/www/paradise-yatra-data-management-system
```

