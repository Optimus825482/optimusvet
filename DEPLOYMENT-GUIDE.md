# 🚀 Optimus Vet - Deployment Guide (Coolify)

## 📋 Ön Gereksinimler

- Coolify kurulu bir sunucu
- PostgreSQL 16+ database
- Node.js 20+ runtime

## 🔧 Coolify Deployment Adımları

### 1. GitHub Repository Bağlantısı

Coolify dashboard'da:

1. **New Resource** → **Git Repository**
2. Repository URL: `https://github.com/Optimus825482/optimusvet.git`
3. Branch: `main`
4. Build Pack: **Nixpacks** veya **Dockerfile**

### 2. Environment Variables

Coolify'da aşağıdaki environment variable'ları ekle:

```bash
# Database (Coolify PostgreSQL service'den alınacak)
DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/optimusvet

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<openssl rand -base64 32 ile oluştur>

# App
NODE_ENV=production
PORT=3000
```

### 3. PostgreSQL Service Ekleme

Coolify'da:

1. **New Resource** → **Database** → **PostgreSQL 16**
2. Database name: `optimusvet`
3. User: `postgres`
4. Password: Güçlü bir şifre oluştur
5. **Connect to Application** ile app'e bağla

### 4. Build & Deploy Settings

**Build Command:**

```bash
npm ci && npm run prisma:generate && npm run build
```

**Start Command:**

```bash
npm run prisma:migrate:deploy && npm start
```

**Port:** `3000`

**Health Check Path:** `/api/health` (opsiyonel)

### 5. Domain & SSL

1. Coolify'da **Domains** sekmesine git
2. Domain ekle: `optimusvet.yourdomain.com`
3. **Generate SSL Certificate** (Let's Encrypt otomatik)

### 6. İlk Deployment

1. **Deploy** butonuna tıkla
2. Build logs'u takip et
3. Deployment tamamlandığında domain'e git
4. İlk kullanıcıyı oluştur: `/auth/register`

## 🗄️ Database Migration

İlk deployment'ta otomatik olarak migration çalışır:

```bash
npm run prisma:migrate:deploy
```

Manuel migration gerekirse Coolify terminal'den:

```bash
npx prisma migrate deploy
```

## 📊 Excel Verilerini Import Etme

Production'da Excel verilerini import etmek için:

1. Coolify terminal'i aç
2. Excel dosyalarını upload et (Coolify file manager veya scp)
3. Import script'ini çalıştır:

```bash
npx tsx scripts/import-sales-final.ts
```

## 🔒 Güvenlik Kontrol Listesi

- ✅ `NEXTAUTH_SECRET` güçlü ve unique olmalı
- ✅ Database şifresi güçlü olmalı
- ✅ `.env` dosyası `.gitignore`'da olmalı
- ✅ SSL sertifikası aktif olmalı
- ✅ CORS ayarları production domain'e göre yapılmalı

## 🔄 Otomatik Deployment (CI/CD)

Coolify otomatik olarak GitHub push'larını dinler:

1. **Settings** → **Auto Deploy** → **Enable**
2. Her `main` branch push'unda otomatik deploy olur

## 📈 Monitoring & Logs

Coolify dashboard'da:

- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network kullanımı
- **Health Checks**: Uptime monitoring

## 🆘 Troubleshooting

### Build Hatası

```bash
# Coolify terminal'den
npm ci
npm run build
```

### Database Connection Hatası

- `DATABASE_URL` environment variable'ını kontrol et
- PostgreSQL service'in çalıştığından emin ol
- Network connectivity'yi test et

### Migration Hatası

```bash
# Coolify terminal'den
npx prisma migrate reset --force
npx prisma migrate deploy
```

## 📞 Destek

Sorun yaşarsan:

1. Coolify logs'u kontrol et
2. GitHub Issues'a yaz
3. Coolify community'ye sor

---

**🎉 Deployment başarılı olduğunda:**

- ✅ Uygulama: `https://your-domain.com`
- ✅ Login: `https://your-domain.com/auth/login`
- ✅ Dashboard: `https://your-domain.com/dashboard`
