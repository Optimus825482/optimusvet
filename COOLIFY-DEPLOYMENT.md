# 🚀 Coolify Deployment - Optimus Vet

## 📋 Deployment Bilgileri

- **Domain**: `https://turan.aihaberleri.org`
- **Port**: `3002`
- **Repository**: `https://github.com/Optimus825482/optimusvet.git`
- **Branch**: `main`

---

## �️ Database Bilgileri (Harici PostgreSQL)

⚠️ **ÖNEMLİ**: Bu proje harici bir PostgreSQL database kullanıyor!

- **Host**: `77.42.68.4`
- **Port**: `5437`
- **Database**: `optimusvet`
- **User**: `postgres`
- **Password**: `518518Erkan`
- **Connection String**: `postgres://postgres:518518Erkan@77.42.68.4:5437/optimusvet`

**Coolify'da PostgreSQL service oluşturmaya gerek YOK!** ❌

---

## 🔧 Coolify Kurulum Adımları

### 1️⃣ Application Service Oluştur

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

### 2️⃣ Environment Variables Ekle

Coolify'da **Environment Variables** sekmesine git ve şunları ekle:

```bash
# External PostgreSQL Database
DATABASE_URL=postgres://postgres:518518Erkan@77.42.68.4:5437/optimusvet

# NextAuth (ÖNEMLİ: Güvenli secret oluştur!)
NEXTAUTH_URL=https://turan.aihaberleri.org
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

### 3️⃣ Build & Deploy Settings

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

### 4️⃣ Domain & SSL Ayarları

Coolify'da **Domains** sekmesine git:

1. **Add Domain**: `turan.aihaberleri.org`
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

### 5️⃣ Network & Firewall (ÖNEMLİ!)

Harici database kullandığınız için Coolify sunucusunun database'e erişebilmesi gerekiyor:

**Database sunucusunda (77.42.68.4):**

1. PostgreSQL'in port `5437`'yi dinlediğinden emin ol
2. Firewall'da Coolify sunucu IP'sine izin ver:

```bash
# PostgreSQL config (postgresql.conf)
listen_addresses = '*'

# PostgreSQL HBA (pg_hba.conf)
host    optimusvet    postgres    [COOLIFY_SERVER_IP]/32    md5
```

**Coolify sunucusunda:**

1. Outbound port `5437` açık olmalı
2. Database connection test et:

```bash
psql "postgres://postgres:518518Erkan@77.42.68.4:5437/optimusvet" -c "SELECT 1"
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
   - ✅ Database migration (harici DB'ye)
   - ✅ Application start

3. Deployment tamamlandığında:
   - `https://turan.aihaberleri.org` adresine git
   - İlk kullanıcıyı oluştur: `/auth/register`

---

## 🗄️ Database Migration

### İlk Kurulum

Deployment sonrası otomatik olarak migration çalışır:

```bash
npx prisma migrate deploy
```

Bu komut harici database'e (`77.42.68.4:5437`) bağlanıp migration'ları uygular.

### Manuel Migration (Gerekirse)

Coolify terminal'den:

```bash
# Migration çalıştır
npx prisma migrate deploy

# Migration durumunu kontrol et
npx prisma migrate status

# Database'i sıfırla (DİKKAT: Tüm veriyi siler!)
npx prisma migrate reset --force
```

### Excel Verilerini Import Etme

Veriler zaten database'de olduğu için import'a gerek yok! ✅

Eğer yeniden import gerekirse:

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

`https://turan.aihaberleri.org/api/health` adresinden sistem durumunu kontrol et:

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
- ✅ Database şifresi güçlü (`518518Erkan`)
- ✅ `.env` dosyası `.gitignore`'da
- ✅ SSL sertifikası aktif (HTTPS)
- ✅ Force HTTPS aktif
- ✅ Database firewall'da Coolify IP'sine izin verildi
- ✅ PostgreSQL `pg_hba.conf` güncellendi
- ✅ Database connection SSL kullanıyor (önerilen)

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

**Hata**: `Can't reach database server at 77.42.68.4:5437`

**Çözümler:**

1. **Network connectivity test et:**

```bash
# Coolify terminal'den
nc -zv 77.42.68.4 5437
telnet 77.42.68.4 5437
```

2. **Database sunucusunda firewall kontrol et:**

```bash
# Database sunucusunda
sudo ufw status
sudo ufw allow from [COOLIFY_IP] to any port 5437
```

3. **PostgreSQL config kontrol et:**

```bash
# Database sunucusunda
cat /etc/postgresql/*/main/postgresql.conf | grep listen_addresses
cat /etc/postgresql/*/main/pg_hba.conf | grep optimusvet
```

4. **PostgreSQL restart:**

```bash
# Database sunucusunda
sudo systemctl restart postgresql
```

5. **Connection string kontrol et:**

```bash
# Coolify terminal'den
echo $DATABASE_URL
# Çıktı: postgres://postgres:518518Erkan@77.42.68.4:5437/optimusvet
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

## 📞 Database Yönetimi

### Database Backup

Database sunucusunda manuel backup:

```bash
# Database sunucusunda
pg_dump -h 77.42.68.4 -p 5437 -U postgres optimusvet > backup_$(date +%Y%m%d).sql
```

### Restore Backup

```bash
# Database sunucusunda
psql -h 77.42.68.4 -p 5437 -U postgres optimusvet < backup_20260130.sql
```

### Database Monitoring

```bash
# Coolify terminal'den database'e bağlan
psql "postgres://postgres:518518Erkan@77.42.68.4:5437/optimusvet"

# Aktif connection'ları gör
SELECT * FROM pg_stat_activity WHERE datname = 'optimusvet';

# Database boyutunu gör
SELECT pg_size_pretty(pg_database_size('optimusvet'));

# Tablo boyutlarını gör
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🎉 Deployment Checklist

Deployment öncesi kontrol et:

- [ ] Harici PostgreSQL database erişilebilir (`77.42.68.4:5437`)
- [ ] Database firewall'da Coolify IP'sine izin verildi
- [ ] PostgreSQL `pg_hba.conf` güncellendi
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
- [ ] Database connection test edildi

---

## 🚀 Deployment Sonrası

Sistem başarıyla deploy edildiğinde:

✅ **Ana Sayfa**: `https://turan.aihaberleri.org`
✅ **Login**: `https://turan.aihaberleri.org/auth/login`
✅ **Register**: `https://turan.aihaberleri.org/auth/register`
✅ **Dashboard**: `https://turan.aihaberleri.org/dashboard`
✅ **Health Check**: `https://turan.aihaberleri.org/api/health`

**Veriler zaten database'de olduğu için direkt kullanmaya başlayabilirsin!** 🎊

---

## 🔗 Faydalı Linkler

- **GitHub Repo**: https://github.com/Optimus825482/optimusvet.git
- **Coolify Docs**: https://coolify.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
