# ⚡ Quick Start Guide - OPTIMUS VETERINER ON MUHASEBE

**5 dakikada ayağa kaldır!**

## 1️⃣ Klonla & Kur (2 dakika)

```bash
# Repository klonla
git clone https://github.com/yourusername/optimus-vet.git
cd optimus-vet

# Dependencies yükle
npm install

# Environment ayarla
cp .env.example .env.local
```

## 2️⃣ Database Başlat (2 dakika)

```bash
# PostgreSQL docker'da çalıştır
docker run --name optimus-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=optimusvet \
  -p 5432:5432 \
  -d postgres:16

# Migration yap
npm run db:migrate

# Demo veri ekle (opsiyonel)
npm run db:seed
```

## 3️⃣ Dev Server Başlat (1 dakika)

```bash
npm run dev
```

Browser'ı aç: **http://localhost:3000**

---

## 📱 Test Credentials

```
Email:    admin@optimusvet.com
Password: admin123
```

---

## 🚀 Temel Operasyonlar

### Satış Oluştur
1. Dashboard → Yeni Satış
2. Müşteri seç
3. Hayvan seç
4. Ürün ekle
5. Kaydet ✅

### Müşteri Ekle
1. Müşteriler → Yeni
2. Ad, telefon, email gir
3. Kaydet ✅

### Raporlar İndir
1. Raporlar → Satış Özeti
2. Dönem seç
3. PDF/Excel indir ✅

---

## 🐳 Docker Kullan (Daha Kolay)

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logs'u izle
docker-compose logs -f

# Durdur
docker-compose down
```

---

## ⚙️ Yapılandırma (`.env.local`)

```
DATABASE_URL=postgresql://postgres:518518Erkan@localhost:5432/optimusvet
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-string-32-chars
```

---

## 🆘 Sorunlar

### "Database bağlantısı reddedildi"
```bash
# PostgreSQL çalışıyor mu?
docker ps | grep postgres

# Değilse başlat
docker-compose up -d
```

### "Port 3000 kullanımda"
```bash
npm run dev -- -p 3001
```

### "Migration hatası"
```bash
npm run db:reset
npm run db:seed
```

---

## 📚 Daha Fazla Bilgi

- **README.md** - Kapsamlı kılavuz
- **DEPLOYMENT.md** - Production deployment
- **QA-CHECKLIST.md** - Test checklist
- **PROJECT-SUMMARY.md** - Proje özeti

---

## 🎯 Sonraki Adımlar

1. ✅ Çalışan sistemi gördü
2. 📝 Kustomizasyonu yap (.env, seeding)
3. 🧪 Testleri çalıştır (`npm run test`)
4. 🚀 Production deploy et

---

**Başarılı! Sistem hazır. 🎉**

Herhangi sorun varsa support@optimusvet.com iletişim kur.
