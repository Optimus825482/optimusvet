# 🚀 Coolify Deployment - Optimus Vet

## 📋 Deployment Bilgileri

- **Domain**: `https://optimus.celilturan.com.tr`
- **Port**: `3002`
- **Repository**: `https://github.com/Optimus825482/optimusvet.git`
- **Branch**: `main`

---

## 🔧 Coolify Kurulum Adımları

### 1️⃣ PostgreSQL Service Oluştur

Coolify Dashboard'da:

1. **New Resource** → **Database** → **PostgreSQL 16**
2. Ayarlar:
   - **Name**: `optimus-vet-db`
   - **Database**: `optimusvet`
   - **Username**: `postgres`
   - **Password**: Güçlü bir şifre oluştur (kaydet!)
   - **Port**: `5432` (internal)
3. **Save** ve **Start**

**Database URL'i kopyala:**

```
postgresql://postgres:YOUR_PASSWORD@optimus-vet-db:5432/optimusvet
```

---

### 2️⃣ Application Service Oluştur

Coolify Dashboard'da:

1. **New Resource** → **Application** → **Public Repository**
2. Repository ayarları:
   - **Git Repository URL**: `https://github.com/Optimus825482/optimusvet.git`
   - **Branch**: `main`
   - **Build Pack**: **Nixpacks** (önerilen) veya **Dockerfile**

3. **General Settings**:
   - **Name**: `optimus-vet`
   - **Port**: `3002`
   - **Publish Directory**: `.next`

---

### 3️⃣ Environment Variables Ekle

Coolify'da **Environment Variables** sekmesine git ve şunları ekle:

```bash
# Database (PostgreSQL service'den aldığın URL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@optimus-vet-db:5432/optimusvet

# NextAuth (ÖNEMLİ: Güvenli secret oluştur!)
NEXTAUTH_URL=https://optimus.celilturan.com.tr
NEXTAUTH_SECRET=BURAYA_GUVENLI_SECRET_YAZ

# Application
NODE_ENV=production
PORT=3002
```

**NEXTAUTH_SECRET oluşturmak için:**

```bash
openssl rand -base64 32
```

Çıkan değeri kopyala ve `NEXTAUTH_SECRET` olarak kullan.

---

### 4️⃣ Build & Deploy Settings

Coolify'da **Build** sekmesine git:

**Build Command:**

```bash
npm ci && npx prisma generate && npm run build
```

**Start Command:**

```bash
npx prisma migrate deploy && npm start
```

**Install Command:**

```bash
npm ci
```

**Base Directory:** `/` (root)

**Publish Directory:** `.next`

---

### 5️⃣ Domain & SSL Ayarları

Coolify'da **Domains** sekmesine git:

1. **Add Domain**: `optimus.celilturan.com.tr`
2. **Generate SSL Certificate** (Let's Encrypt otomatik)
3. **Force HTTPS**: ✅ Aktif et

**DNS Ayarları (Domain sağlayıcında):**

```
Type: A
Name: optimus
Value: [Coolify sunucu IP adresi]
TTL: 3600
```

veya

```
Type: CNAME
Name: optimus
Value: [Coolify sunucu domain]
TTL: 3600
```

---

### 6️⃣ Health Check (Opsiyonel ama Önerilen)

Coolify'da **Health Check** sekmesine git:

- **Health Check Path**: `/api/health`
- **Health Check Method**: `GET`
- **Health Check Interval**: `30` saniye
- **Health Check Timeout**: `10` saniye
- **Health Check Retries**: `3`

---

### 7️⃣ İlk Deployment

1. **Deploy** butonuna tıkla
2. **Build Logs**'u takip et:
   - ✅ Dependencies install
   - ✅ Prisma generate
   - ✅ Next.js build
   - ✅ Database migration
   - ✅ Application start

3. Deployment tamamlandığında:
   - `https://optimus.celilturan.com.tr` adresine git
   - İlk kullanıcıyı oluştur: `/auth/register`

---

## 🗄️ Database Migration & Seed

### İlk Kurulum

Deployment sonrası otomatik olarak migration çalışır:

```bash
npx prisma migrate deploy
```

### Manuel Migration (Gerekirse)

Coolify terminal'den:

```bash
# Migration çalıştır
npx prisma migrate deploy

# Database'i sıfırla (DİKKAT: Tüm veriyi siler!)
npx prisma migrate reset --force
```

### Excel Verilerini Import Etme

1. Coolify **File Manager**'dan Excel dosyalarını upload et:
   - `satis.xlsx`
   - `satisdetay.xlsx`
   - `musteri.xlsx`
   - `urunler.xlsx`

2. Coolify terminal'den import script'ini çalıştır:

```bash
npx tsx scripts/import-sales-final.ts
```

---

## 🔄 Otomatik Deployment (CI/CD)

### GitHub Webhook Kurulumu

Coolify'da **Settings** → **Webhooks**:

1. **Auto Deploy on Push**: ✅ Aktif et
2. **Branch**: `main`
3. Webhook URL'i kopyala

GitHub Repository'de:

1. **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: Coolify'dan kopyaladığın URL
3. **Content type**: `application/json`
4. **Events**: `Just the push event`
5. **Active**: ✅

Artık her `git push` sonrası otomatik deploy olur! 🎉

---

## 📊 Monitoring & Logs

### Real-time Logs

Coolify'da **Logs** sekmesi:

- Application logs
- Build logs
- Error logs

### Metrics

Coolify'da **Metrics** sekmesi:

- CPU kullanımı
- Memory kullanımı
- Network trafiği
- Disk kullanımı

### Health Status

`https://optimus.celilturan.com.tr/api/health` adresinden sistem durumunu kontrol et:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T18:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 🔒 Güvenlik Kontrol Listesi

- ✅ `NEXTAUTH_SECRET` güçlü ve unique (32+ karakter)
- ✅ Database şifresi güçlü (16+ karakter, özel karakterler)
- ✅ `.env` dosyası `.gitignore`'da
- ✅ SSL sertifikası aktif (HTTPS)
- ✅ Force HTTPS aktif
- ✅ Database sadece internal network'te erişilebilir
- ✅ Firewall kuralları aktif
- ✅ Regular backup aktif (Coolify otomatik)

---

## 🆘 Troubleshooting

### Build Hatası

**Hata**: `npm ci` başarısız

```bash
# Coolify terminal'den
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Hatası

**Hata**: `Can't reach database server`

1. PostgreSQL service'in çalıştığını kontrol et
2. `DATABASE_URL` environment variable'ını kontrol et
3. Database service name'i doğru mu? (`optimus-vet-db`)
4. Network connectivity test et:

```bash
# Coolify terminal'den
nc -zv optimus-vet-db 5432
```

### Migration Hatası

**Hata**: `Migration failed`

```bash
# Coolify terminal'den
npx prisma migrate resolve --rolled-back "MIGRATION_NAME"
npx prisma migrate deploy
```

### Port Conflict

**Hata**: `Port 3002 already in use`

Coolify'da **Port** ayarını kontrol et:

- Internal Port: `3002`
- External Port: `80` (Coolify otomatik yönlendirir)

### SSL Certificate Hatası

**Hata**: `SSL certificate not valid`

1. Domain DNS ayarlarını kontrol et (A record doğru mu?)
2. Coolify'da **Regenerate SSL Certificate**
3. 5-10 dakika bekle (DNS propagation)

---

## 📞 Destek & İletişim

### Logları İncele

```bash
# Application logs
docker logs optimus-vet -f

# Database logs
docker logs optimus-vet-db -f
```

### Database Backup

Coolify otomatik backup yapar, manuel backup için:

```bash
# Coolify terminal'den
pg_dump -U postgres optimusvet > backup_$(date +%Y%m%d).sql
```

### Restore Backup

```bash
# Coolify terminal'den
psql -U postgres optimusvet < backup_20260130.sql
```

---

## 🎉 Deployment Checklist

Deployment öncesi kontrol et:

- [ ] PostgreSQL service oluşturuldu ve çalışıyor
- [ ] Environment variables eklendi
- [ ] `NEXTAUTH_SECRET` güçlü ve unique
- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası oluşturuldu
- [ ] Build & deploy settings doğru
- [ ] Health check aktif
- [ ] Auto deploy webhook kuruldu
- [ ] İlk deployment başarılı
- [ ] `/auth/register` ile ilk kullanıcı oluşturuldu
- [ ] Dashboard'a giriş yapıldı
- [ ] Excel verileri import edildi (opsiyonel)

---

## 🚀 Deployment Sonrası

Sistem başarıyla deploy edildiğinde:

✅ **Ana Sayfa**: `https://optimus.celilturan.com.tr`
✅ **Login**: `https://optimus.celilturan.com.tr/auth/login`
✅ **Register**: `https://optimus.celilturan.com.tr/auth/register`
✅ **Dashboard**: `https://optimus.celilturan.com.tr/dashboard`
✅ **Health Check**: `https://optimus.celilturan.com.tr/api/health`

**İlk kullanıcıyı oluştur ve sistemi kullanmaya başla!** 🎊
