# EventX Studio - Deployment Guide

This guide provides step-by-step instructions for deploying EventX Studio to production environments.

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB instance)
- Git repository access
- Domain name (optional)

## Environment Setup

### 1. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**

   - Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account
   - Create a new cluster

2. **Configure Database Access**

   - Go to Database Access
   - Create a database user with read/write permissions
   - Note down the username and password

3. **Configure Network Access**

   - Go to Network Access
   - Add IP address `0.0.0.0/0` for global access (or specific IPs)

4. **Get Connection String**
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database user password

### 2. Environment Variables

Create environment files for both frontend and backend:

**Backend `.env`:**

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventx-studio
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

**Frontend `.env`:**

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_APP_NAME=EventX Studio
```

## Backend Deployment

### Option 1: Railway Deployment

1. **Install Railway CLI**

   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**

   ```bash
   railway login
   ```

3. **Deploy Backend**

   ```bash
   cd backend
   railway init
   railway up
   ```

4. **Set Environment Variables**

   ```bash
   railway variables set MONGODB_URI="your-mongodb-connection-string"
   railway variables set JWT_SECRET="your-jwt-secret"
   railway variables set NODE_ENV="production"
   ```

### Option 2: Heroku Deployment

1. **Install Heroku CLI**

   - Download from [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login to Heroku**

   ```bash
   heroku login
   ```

3. **Create Heroku App**

   ```bash
   cd backend
   heroku create eventx-studio-backend
   ```

4. **Set Environment Variables**

   ```bash
   heroku config:set MONGODB_URI="your-mongodb-connection-string"
   heroku config:set JWT_SECRET="your-jwt-secret"
   heroku config:set NODE_ENV="production"
   ```

5. **Deploy**

   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Option 3: DigitalOcean App Platform

1. **Create Account**

   - Sign up at [DigitalOcean](https://www.digitalocean.com/)

2. **Create App**

   - Go to Apps → Create App
   - Connect your GitHub repository
   - Select the backend folder

3. **Configure Environment**
   - Add environment variables in the app settings
   - Set build and run commands:
     - Build: `npm install`
     - Run: `npm start`

## Frontend Deployment

### Option 1: Vercel Deployment

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**

   ```bash
   cd frontend/eventx-frontend
   vercel
   ```

3. **Set Environment Variables**
   - Go to Vercel dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add `VITE_API_BASE_URL` with your backend URL

### Option 2: Netlify Deployment

1. **Build the Project**

   ```bash
   cd frontend/eventx-frontend
   npm run build
   ```

2. **Deploy to Netlify**

   - Go to [Netlify](https://www.netlify.com/)
   - Drag and drop the `dist` folder
   - Or connect your Git repository

3. **Configure Environment Variables**
   - Go to Site settings → Environment variables
   - Add `VITE_API_BASE_URL` with your backend URL

### Option 3: GitHub Pages (Static Only)

1. **Install gh-pages**

   ```bash
   cd frontend/eventx-frontend
   npm install --save-dev gh-pages
   ```

2. **Update package.json**

   ```json
   {
     "homepage": "https://yourusername.github.io/eventx-studio",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Deploy**

   ```bash
   npm run deploy
   ```

## Domain Configuration

### Custom Domain Setup

1. **Purchase Domain**

   - Use providers like Namecheap, GoDaddy, or Google Domains

2. **Configure DNS**

   - Point your domain to your hosting provider
   - Set up CNAME or A records as required

3. **SSL Certificate**
   - Most hosting providers offer free SSL certificates
   - Enable HTTPS for both frontend and backend

## Production Optimizations

### Backend Optimizations

1. **Security Headers**

   ```javascript
   // Add to server.js
   app.use(helmet());
   app.use(compression());
   ```

2. **Rate Limiting**

   ```javascript
   const rateLimit = require("express-rate-limit");

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
   });

   app.use("/api/", limiter);
   ```

3. **Logging**

   ```javascript
   const winston = require("winston");

   const logger = winston.createLogger({
     level: "info",
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: "error.log", level: "error" }),
       new winston.transports.File({ filename: "combined.log" }),
     ],
   });
   ```

### Frontend Optimizations

1. **Build Optimization**

   ```javascript
   // vite.config.js
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ["react", "react-dom"],
             charts: ["recharts"],
           },
         },
       },
     },
   });
   ```

2. **Performance Monitoring**
   - Add Google Analytics or similar
   - Implement error tracking with Sentry

## Monitoring and Maintenance

### Health Checks

1. **Backend Health Endpoint**

   ```javascript
   app.get("/health", (req, res) => {
     res.status(200).json({
       status: "OK",
       timestamp: new Date().toISOString(),
       uptime: process.uptime(),
     });
   });
   ```

2. **Database Connection Check**

   ```javascript
   app.get("/health/db", async (req, res) => {
     try {
       await mongoose.connection.db.admin().ping();
       res.status(200).json({ database: "Connected" });
     } catch (error) {
       res.status(500).json({ database: "Disconnected" });
     }
   });
   ```

### Backup Strategy

1. **Database Backups**

   - MongoDB Atlas provides automatic backups
   - Set up additional backup schedules if needed

2. **Code Backups**
   - Ensure code is backed up in Git repository
   - Tag releases for easy rollback

## Troubleshooting

### Common Issues

1. **CORS Errors**

   - Ensure backend CORS is configured for frontend domain
   - Check environment variables are set correctly

2. **Database Connection Issues**

   - Verify MongoDB connection string
   - Check network access settings in MongoDB Atlas

3. **Build Failures**

   - Check Node.js version compatibility
   - Verify all dependencies are installed

4. **Environment Variables**
   - Ensure all required environment variables are set
   - Check variable names match exactly

### Debug Commands

```bash
# Check backend logs
heroku logs --tail -a your-app-name

# Check frontend build
npm run build -- --debug

# Test API endpoints
curl https://your-backend-domain.com/health
```

## Security Checklist

- [ ] HTTPS enabled for both frontend and backend
- [ ] Environment variables properly configured
- [ ] Database access restricted to application only
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] JWT secrets are secure and unique
- [ ] CORS configured for specific domains
- [ ] Security headers implemented
- [ ] Regular dependency updates scheduled

## Performance Checklist

- [ ] Frontend assets minified and compressed
- [ ] Images optimized for web
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] CDN configured for static assets
- [ ] Monitoring and analytics set up

## Post-Deployment

1. **Test All Features**

   - User registration and login
   - Event creation and management
   - Ticket booking process
   - Analytics and reports

2. **Monitor Performance**

   - Set up uptime monitoring
   - Monitor response times
   - Track error rates

3. **User Feedback**
   - Collect user feedback
   - Monitor support requests
   - Plan feature updates

---

**Deployment Status**: Ready for Production 🚀  
**Support**: Contact development team for deployment assistance
