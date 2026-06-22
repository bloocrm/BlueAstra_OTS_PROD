# Bloo CRM - Installation & Setup Guide

## Quick Start (Standalone - No Backend)

### 1. Direct Browser Access
```bash
# Simply open the file in your browser
open frontend/index.html
# or right-click → Open with → Your Browser
```

**That's it!** Bloo CRM will work entirely in your browser using LocalStorage.

### Requirements
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript enabled
- ~50MB of LocalStorage available

---

## Full Installation (With Backend Server)

### Prerequisites
- Node.js 14+ installed
- npm or yarn package manager
- MongoDB or PostgreSQL (optional for production)
- Git (for cloning repository)

### Step 1: Extract & Navigate

```bash
# Extract the bloo-crm folder
cd bloo-crm
```

### Step 2: Install Frontend Dependencies

```bash
# No dependencies! Frontend is pure vanilla JavaScript
# Just ensure all files are in the frontend directory
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# For development, default values work fine
```

### Step 5: Start the Backend Server

```bash
# From backend directory
npm start

# Or for development with auto-reload
npm run dev
```

Server will start on `http://localhost:5000`

### Step 6: Open Frontend

```bash
# Open in your browser
open ../frontend/index.html

# Or use a simple HTTP server for better experience
cd ../frontend
python -m http.server 8000
# Then visit: http://localhost:8000
```

---

## Docker Deployment

### Build and Run with Docker

```bash
# Build Docker image
docker build -t bloo-crm .

# Run container
docker run -p 5000:5000 -e NODE_ENV=production bloo-crm
```

### Docker Compose

```bash
docker-compose up -d
```

---

## Production Deployment

### 1. Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create new app
heroku create your-bloo-crm-app

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### 2. AWS EC2 Deployment

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-instance.com

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# Clone repository
git clone <your-repo-url>
cd bloo-crm/backend

# Install dependencies
npm install

# Start server
NODE_ENV=production npm start

# Use PM2 for process management
npm install -g pm2
pm2 start server.js
```

### 3. Database Setup (Production)

#### MongoDB

```bash
# Install MongoDB
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Create database
mongo
> use bloo-crm
> db.createCollection("users")
```

#### PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql

# Create database
createdb bloo_crm

# Create tables
psql bloo_crm < schema.sql
```

---

## Configuration

### Frontend Configuration

Edit `frontend/js/config.js` (create if needed):

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
  ENABLE_BACKEND: false,
  LOCAL_STORAGE_KEY: 'bloo-crm-data',
  MAX_BACKUP_SIZE: '10MB',
  SESSION_TIMEOUT: 3600000 // 1 hour
};
```

### Backend Configuration

Create `.env` file in `backend/` directory:

```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_NAME=bloo-crm
CORS_ORIGIN=http://localhost:3000
```

---

## Testing

### Frontend Testing

```bash
# Manual testing checklist
1. Registration - create new account
2. Login - verify authentication
3. Add Client - create new client
4. Add Lead - create new lead
5. Log Communication - record interaction
6. View Workflow - check audit log
7. Export Data - backup functionality
8. AI Insights - generate recommendations
```

### Backend Testing

```bash
cd backend

# Test health endpoint
curl http://localhost:5000/health

# Test API endpoints
curl -X GET http://localhost:5000/api/version
curl -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","email":"test@example.com"}'
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Issue: CORS Errors

**Solution**: Update `.env` with correct FRONTEND_URL

```
CORS_ORIGIN=http://your-frontend-url:port
```

### Issue: Database Connection Failed

```bash
# Check MongoDB is running
brew services list

# Start MongoDB
brew services start mongodb-community

# Or use cloud MongoDB
# Update DB_HOST in .env to MongoDB Atlas connection string
```

### Issue: LocalStorage Full

```javascript
// Clear old data in browser console
localStorage.clear();
// or selective clear
delete localStorage['currentUser'];
```

---

## Development Workflow

### 1. Frontend Development

```bash
# Live reload with Python
cd frontend
python -m http.server 8000

# Edit files and refresh browser
```

### 2. Backend Development

```bash
# Auto-reload with nodemon
cd backend
npm run dev

# Edit route files, server auto-restarts
```

### 3. Database Development

```bash
# Connect to MongoDB
mongo bloo-crm

# View collections
show collections

# Query users
db.users.find().pretty()

# Drop database (development only!)
db.dropDatabase()
```

---

## Security Hardening

### Before Production

```bash
# 1. Update .env with secure values
JWT_SECRET=generate-very-long-random-string-here
SMTP_PASSWORD=your-secure-password

# 2. Enable HTTPS
# Update frontend to use https:// URLs

# 3. Enable authentication
# Uncomment auth middleware in server.js

# 4. Add rate limiting
# npm install express-rate-limit

# 5. Enable logging
LOG_LEVEL=info

# 6. Use environment variables
NODE_ENV=production npm start
```

### SSL/TLS Certificate

```bash
# Using Let's Encrypt
npm install -g certbot

certbot certonly --standalone -d yourdomain.com

# Update server.js to use certificate
```

---

## Monitoring & Logging

### View Server Logs

```bash
# Using PM2
pm2 logs bloo-crm

# Using systemd
sudo journalctl -u bloo-crm -f
```

### Monitor Performance

```bash
# CPU and Memory usage
pm2 monit

# Database statistics
mongo
> use bloo-crm
> db.stats()
```

---

## Backup & Restore

### Backup Data

```bash
# Automated daily backup
# Add to crontab
0 2 * * * /backup-script.sh

# Manual backup
mongodump -d bloo-crm -o ./backup/
```

### Restore Data

```bash
mongorestore --db bloo-crm ./backup/bloo-crm/
```

---

## Scaling Considerations

For large deployments:

1. **Load Balancing**: Use nginx or HAProxy
2. **Caching**: Implement Redis for session management
3. **Database**: Use database replication
4. **CDN**: Serve static assets via CDN
5. **Containerization**: Deploy with Docker/Kubernetes

---

## Support & Updates

### Check for Updates

```bash
git pull origin main
npm install
npm start
```

### Report Issues

- Create issue on GitHub
- Include: OS, browser version, error logs
- Attach screenshots if applicable

---

## Quick Reference Commands

```bash
# Start everything
cd bloo-crm/backend && npm start &
cd bloo-crm/frontend && python -m http.server 8000

# Stop everything
pkill -f "npm start"
pkill -f "http.server"

# View logs
tail -f nohup.out

# Database commands
mongo bloo-crm
show collections
db.dropDatabase()

# Reset to defaults
rm -rf node_modules package-lock.json
npm install
```

---

**For detailed API documentation, see [API.md](./API.md)**

**Version**: 1.0.0  
**Last Updated**: May 2026
