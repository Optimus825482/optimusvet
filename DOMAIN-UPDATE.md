# 🌐 Domain Güncelleme - turan.aihaberleri.org

## ✅ Güncellenen Dosyalar

### 1. Environment Variables

- ✅ `.env.production` - NEXTAUTH_URL güncellendi
- ✅ `.env` - Local development (değişmedi, localhost)

### 2. Documentation

- ✅ `COOLIFY-DEPLOYMENT.md` - Tüm domain referansları güncellendi
- ✅ `CLOUDFLARE-DNS-SETUP.md` - DNS kurulum adımları güncellendi

## 🚀 Deployment Adımları

### 1. Coolify'da Domain Güncelleme

1. Coolify Dashboard'a git
2. Optimus Vet projesini seç
3. **Domains** sekmesine git
4. Eski domain'i sil: `optimus.celilturan.com.tr`
5. Yeni domain ekle: `turan.aihaberleri.org`
6. **Generate SSL Certificate** (Let's Encrypt otomatik)
7. **Force HTTPS** aktif et

### 2. Cloudflare DNS Ayarları

**Domain**: `aihaberleri.org`

#### A Record Ekle:

```
Type: A
Name: turan
Content: [COOLIFY_SUNUCU_IP]
Proxy status: Proxied (🟠)
TTL: Auto
```

#### SSL/TLS Ayarları:

- **SSL/TLS encryption mode**: Full (strict)
- **Always Use HTTPS**: ✅ Aktif
- **Automatic HTTPS Rewrites**: ✅ Aktif

### 3. Environment Variables (Coolify)

Coolify'da **Environment Variables** sekmesinde güncelle:

```bash
NEXTAUTH_URL=https://turan.aihaberleri.org
NEXTAUTH_SECRET=[MEVCUT_SECRET_AYNI_KALSIN]
DATABASE_URL=postgres://postgres:518518Erkan@77.42.68.4:5437/optimusvet
NODE_ENV=production
PORT=3002
```

### 4. Redeploy

1. Coolify'da **Redeploy** butonuna tıkla
2. Build ve deployment tamamlanmasını bekle (2-3 dakika)
3. DNS propagation için 5-10 dakika bekle

## ✅ Doğrulama

### 1. DNS Kontrolü

```bash
nslookup turan.aihaberleri.org
dig turan.aihaberleri.org
```

### 2. SSL Kontrolü

```bash
curl -I https://turan.aihaberleri.org
```

### 3. Health Check

```
https://turan.aihaberleri.org/api/health
```

Beklenen yanıt:

```json
{
  "status": "ok",
  "timestamp": "2026-01-30T...",
  "database": "connected"
}
```

### 4. Login Test

```
https://turan.aihaberleri.org/auth/login
```

## 📝 Notlar

- ✅ Database bağlantısı değişmedi (aynı PostgreSQL sunucusu)
- ✅ Tüm veriler korundu
- ✅ Sadece domain değişti
- ✅ SSL otomatik olarak Let's Encrypt ile oluşturulacak
- ✅ Cloudflare proxy aktif (DDoS koruması)

## 🔗 Yeni URL'ler

- **Ana Sayfa**: https://turan.aihaberleri.org
- **Login**: https://turan.aihaberleri.org/auth/login
- **Dashboard**: https://turan.aihaberleri.org/dashboard
- **Health Check**: https://turan.aihaberleri.org/api/health

## ⚠️ Önemli

1. **DNS Propagation**: 5-10 dakika sürebilir
2. **SSL Certificate**: Coolify otomatik oluşturacak (1-2 dakika)
3. **Eski Domain**: `optimus.celilturan.com.tr` artık çalışmayacak
4. **Database**: Değişiklik yok, aynı database kullanılıyor

---

**Güncelleme Tarihi**: 30 Ocak 2026
**Yeni Domain**: turan.aihaberleri.org
**Durum**: ✅ Hazır
