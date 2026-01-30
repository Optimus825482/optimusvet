# Deployment Guide - OPTIMUS VETERINER ON MUHASEBE

## 🚀 Deployment Seçenekleri

### 1. Vercel (En Kolay)

```bash
# 1. Vercel CLI yükle
npm install -g vercel

# 2. Deploy et
vercel

# 3. Environment variables ayarla
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
```

### 2. Docker + Coolify

```bash
# 1. Coolify'da yeni app oluştur
# - Connect Git repo
# - Dockerfile: ./Dockerfile
# - Build command: npm run build
# - Start command: npm start

# 2. Environment variables:
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# 3. Deploy et
git push
```

### 3. Docker + DigitalOcean App Platform

```bash
# 1. App Platform'da yeni app
# - Connect GitHub repo
# - Build: npm run build
# - Run: npm start

# 2. Add PostgreSQL service
# - Name: postgres
# - Engine: PostgreSQL 16

# 3. Environment variables
DATABASE_URL=${{postgres.DATABASE_URL}}
NEXTAUTH_SECRET=(generate)
NEXTAUTH_URL=https://your-app.ondigitalocean.app
```

### 4. Docker + AWS

```bash
# 1. ECR repository oluştur
aws ecr create-repository --repository-name optimus-vet

# 2. Docker image build et
docker build -t optimus-vet .

# 3. ECR push et
docker tag optimus-vet:latest <account>.dkr.ecr.<region>.amazonaws.com/optimus-vet:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/optimus-vet:latest

# 4. ECS task definition oluştur ve deploy et
```

### 5. Self-Hosted (VPS)

```bash
# 1. SSH olarak VPS'e bağlan
ssh root@your-server.com

# 2. Node.js ve PostgreSQL kur
apt-get update
apt-get install nodejs postgresql

# 3. Repository klonla
git clone https://github.com/yourusername/optimus-vet.git
cd optimus-vet

# 4. Environment ayarla
cp .env.example .env.local
# Edit .env.local

# 5. Build et
npm install
npm run prisma:migrate
npm run build

# 6. PM2 ile çalıştır
npm install -g pm2
pm2 start "npm start" --name optimus-vet
pm2 save

# 7. Nginx reverse proxy
# (Configure nginx config file)
```

---

## 📋 Pre-Deployment Checklist

- [ ] Environment variables kontrol et
- [ ] Database backup al
- [ ] .env.local'i güvenli sakla
- [ ] Sertifika kontrol et
- [ ] DNS ayarlarını kontrol et
- [ ] CDN configuration
- [ ] Monitoring setup

---

## 🔧 Post-Deployment

### 1. Migrations Çalıştır
```bash
npm run prisma:migrate:deploy
```

### 2. Seed Data (Opsiyonel)
```bash
npm run db:seed
```

### 3. Health Check
```bash
curl https://your-app.com/api/health
```

### 4. Monitoring Kurulumu
```bash
# Sentry setup (error tracking)
npm install @sentry/nextjs
# Configure .env

# Datadog/New Relic integration
# Database monitoring enable
```

### 5. Backup Setup
```bash
# PostgreSQL automated backup
pg_dump -U postgres optimusvet > backup.sql
# Setup daily cron job
```

---

## 🚨 Environment Variables

### Required
```
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXTAUTH_SECRET=(min 32 chars, random)
NEXTAUTH_URL=https://yourdomain.com
```

### Optional
```
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
LOG_LEVEL=info
```

---

## 🔐 Security Best Practices

1. **Database**
   - SSL/TLS connection required
   - Separate read replica for analytics
   - Regular automated backups

2. **Application**
   - HTTPS only
   - Security headers (HSTS, CSP, X-Frame-Options)
   - Rate limiting enabled
   - Input validation strict

3. **Secrets**
   - Use environment variables, not hardcoded
   - Rotate secrets quarterly
   - Use HashiCorp Vault in production

4. **Monitoring**
   - Set up alerts for errors
   - Monitor database query times
   - Track API response times

---

## 📈 Scaling Strategy

### Phase 1: Single Instance
- 1 App server
- 1 PostgreSQL instance
- CDN for static assets

### Phase 2: Load Balancing
- 2+ App servers behind load balancer
- Read replicas for database
- Redis cache layer

### Phase 3: Multi-Region
- App in multiple regions
- Global database replication
- DDoS protection

---

## 🔄 CI/CD Pipeline

Pipeline automatically:
1. Runs tests
2. Builds application
3. Pushes Docker image
4. Deploys to staging
5. Runs smoke tests
6. Deploys to production

See `.github/workflows/ci-cd.yml`

---

## 🚨 Troubleshooting

### App won't start
```bash
# Check logs
docker logs optimus-vet-app

# Check environment
env | grep DATABASE_URL

# Test connection
npm run prisma:db:push
```

### Database connection issues
```bash
# Test connection
psql -h localhost -U postgres -d optimusvet

# Check migrations
npm run prisma:migrate:status
```

### High memory usage
```bash
# Profile application
node --inspect=9229 server.js

# Chrome devtools: chrome://inspect
```

---

## 📊 Performance Monitoring

### Key Metrics to Track
- Page load time (LCP, FCP)
- API response time (P50, P95)
- Database query time
- Error rate
- Uptime percentage

### Tools
- Vercel Analytics
- Sentry for error tracking
- New Relic/Datadog for infrastructure
- Google Analytics for user behavior

---

## 🆘 Rollback Procedure

If deployment fails:

```bash
# 1. Check logs
docker logs optimus-vet-app

# 2. Rollback to previous version
git revert <commit-hash>
git push

# 3. Deploy again
vercel deploy --prod

# 4. Verify health
curl https://your-app.com/api/health
```

---

## 📞 Support & Monitoring

24/7 Monitoring Setup:
- Uptime monitoring (Pingdom, Statuspage)
- Alert channels (Email, Slack, PagerDuty)
- Incident response team
- Escalation procedures

---

**Last Updated:** 30 Ocak 2026
**Status:** ✅ Production Ready
