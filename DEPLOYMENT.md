# Deployment Guide - AI Observability SDK Platform

This guide explains how to deploy the AI Observability SDK Platform on any hosting platform. The application is now fully portable and uses standard email/password authentication that works anywhere.

## Prerequisites

- **Node.js** 18+ or 20+ (recommended)
- **PostgreSQL** database (any version that supports modern SQL)
- A hosting platform (Vercel, AWS, Railway, Render, DigitalOcean, etc.)

## Environment Variables

Create a `.env` file or configure these environment variables in your hosting platform:

```bash
# Database Connection
DATABASE_URL=postgresql://username:password@host:port/database

# Session Secret (use a strong random string)
SESSION_SECRET=your-strong-random-secret-here

# Stripe Payment Configuration (optional - see STRIPE_SETUP.md)
STRIPE_SECRET_KEY=sk_test_or_sk_live_your_key_here
STRIPE_PRICE_ID=price_your_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Node Environment
NODE_ENV=production

# Port (optional, defaults to 5000)
PORT=5000
```

### Stripe Configuration (Optional)

The platform includes built-in Stripe subscription support with:
- 14-day free trial
- $49/month subscription after trial
- Automatic payment processing and webhook handling

To enable payments, see **STRIPE_SETUP.md** for complete setup instructions. The application works perfectly without Stripe configured - users just won't see billing/subscription features.

### Generating a Secure Session Secret

Generate a secure random session secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Database Setup

### 1. Create PostgreSQL Database

Create a new PostgreSQL database on your hosting platform:

- **Neon**: https://neon.tech (recommended, serverless)
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app
- **AWS RDS**: Amazon RDS for PostgreSQL
- **Self-hosted**: Any PostgreSQL instance

### 2. Apply Database Schema

The application will automatically create the `sessions` table on first run. For the main application schema, run:

```bash
npm install
npm run db:push
```

This uses Drizzle ORM to push the schema to your database.

### 3. Database Tables

The application creates these tables:
- `users` - User accounts with hashed passwords
- `sessions` - Session storage (auto-created)
- `workspaces` - Multi-tenant workspaces
- `workspace_members` - Team membership and RBAC
- `projects` - Project organization
- `api_keys` - API key management
- `telemetry_logs` - AI telemetry data

## Deployment Platforms

### Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Configure Build**:
   Create `vercel.json`:
   ```json
   {
     "builds": [
       {
         "src": "server/index.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server/index.ts"
       }
     ]
   }
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard

### Railway

1. **Connect Repository** to Railway
2. **Set Environment Variables** in Railway Dashboard
3. **Configure Build Command**:
   - Build: `npm install && npm run build`
   - Start: `npm start`
4. **Deploy** automatically on git push

### AWS / EC2

1. **Launch EC2 Instance** (Ubuntu 22.04+)

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone Repository**:
   ```bash
   git clone <your-repo>
   cd <repo-directory>
   ```

4. **Install Dependencies**:
   ```bash
   npm install
   ```

5. **Set Environment Variables**:
   ```bash
   echo "DATABASE_URL=postgresql://..." >> .env
   echo "SESSION_SECRET=..." >> .env
   echo "NODE_ENV=production" >> .env
   ```

6. **Apply Database Schema**:
   ```bash
   npm run db:push
   ```

7. **Build Application**:
   ```bash
   npm run build
   ```

8. **Run with PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "ai-observability" -- start
   pm2 save
   pm2 startup
   ```

9. **Configure Nginx** (reverse proxy):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker

1. **Create `Dockerfile`**:
   ```dockerfile
   FROM node:20-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   RUN npm run build
   
   EXPOSE 5000
   
   CMD ["npm", "start"]
   ```

2. **Create `.dockerignore`**:
   ```
   node_modules
   .env
   dist
   ```

3. **Build and Run**:
   ```bash
   docker build -t ai-observability .
   docker run -p 5000:5000 \
     -e DATABASE_URL="postgresql://..." \
     -e SESSION_SECRET="..." \
     -e NODE_ENV="production" \
     ai-observability
   ```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/ai_observability
      - SESSION_SECRET=your-secret-here
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=ai_observability
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up -d
```

## Post-Deployment

### 1. Create First User

Navigate to your deployed application and click "Get Started" to create your first user account. The registration flow automatically:
- Creates a user with bcrypt-hashed password
- Creates a default workspace
- Assigns you as workspace owner

### 2. Verify Authentication

Test the authentication flow:
1. Register a new account
2. Log out
3. Log back in with your credentials
4. Verify workspace access

### 3. Database Backups

Set up automated database backups:
- **Neon**: Automatic backups included
- **Supabase**: Automatic backups included
- **AWS RDS**: Configure automated snapshots
- **Self-hosted**: Use `pg_dump` with cron jobs

## Security Checklist

- ✅ Use HTTPS in production (TLS/SSL)
- ✅ Strong `SESSION_SECRET` (32+ random bytes)
- ✅ Secure database connection (SSL/TLS)
- ✅ Keep dependencies updated (`npm audit`)
- ✅ Enable database backups
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Secure cookie flags (httpOnly, secure in production)

## Monitoring

Monitor your application:
- Application logs via hosting platform
- Database performance metrics
- Session storage usage
- API response times

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Verify `DATABASE_URL` is correct
2. Check database is accessible from your hosting platform
3. Ensure firewall/security groups allow connections

### Session Issues

If users can't log in/stay logged in:
1. Verify `SESSION_SECRET` is set
2. Check sessions table exists in database
3. Ensure cookies are enabled in browser

### Build Failures

If build fails:
1. Ensure Node.js version is 18+
2. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npm run build`

## Support

For issues specific to this deployment:
- Check application logs
- Verify environment variables are set correctly
- Ensure database schema is up to date (`npm run db:push`)

## Migrating from Replit

If you previously deployed on Replit with Replit Auth:
1. This version uses email/password auth (no Replit dependencies)
2. Export any existing user data before migrating
3. Users will need to create new accounts after deployment
4. Database structure is compatible (workspace/project/logs tables unchanged)
