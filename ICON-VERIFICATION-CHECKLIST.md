# Icon Verification Checklist

## 🎯 Hızlı Doğrulama

### 1. Dosya Varlığı Kontrolü

```bash
# Tüm icon'ların oluşturulduğunu kontrol et
ls public/icons/

# Beklenen çıktı:
# apple-touch-icon.png
# favicon-16x16.png
# favicon-32x32.png
# favicon-48x48.png
# icon-72x72.png
# icon-96x96.png
# icon-128x128.png
# icon-144x144.png
# icon-152x152.png
# icon-192x192.png
# icon-384x384.png
# icon-512x512.png
# icon-192x192-maskable.png
# icon-512x512-maskable.png
```

### 2. Favicon Kontrolü

```bash
# Favicon.ico'nun varlığını kontrol et
ls public/favicon.ico
```

### 3. Manifest Kontrolü

```bash
# Manifest.json'u görüntüle
cat public/manifest.json | grep -A 5 "icons"
```

## 🌐 Browser Test

### Desktop Test

1. **Chrome/Edge:**
   - Dev server'ı başlat: `npm run dev`
   - http://localhost:3002 aç
   - Browser tab'ında favicon görünmeli
   - DevTools > Application > Manifest kontrol et
   - "Install app" butonu görünmeli

2. **Firefox:**
   - http://localhost:3002 aç
   - Browser tab'ında favicon görünmeli

3. **Safari:**
   - http://localhost:3002 aç
   - Browser tab'ında favicon görünmeli

### Mobile Test (Chrome DevTools)

1. DevTools aç (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Mobile device seç (iPhone, Pixel, etc.)
4. Sayfayı yenile
5. DevTools > Application > Manifest
6. "Add to home screen" simüle et

## 📱 Real Device Test

### Android Test

1. Chrome'da http://[YOUR_IP]:3002 aç
2. Menu > "Add to Home screen"
3. Icon'un doğru göründüğünü kontrol et
4. Home screen'e ekle
5. Uygulamayı aç
6. Splash screen'i kontrol et

### iOS Test

1. Safari'de http://[YOUR_IP]:3002 aç
2. Share button > "Add to Home Screen"
3. Icon'un doğru göründüğünü kontrol et
4. Home screen'e ekle
5. Uygulamayı aç

## 🔍 Lighthouse Audit

### PWA Audit Çalıştırma

1. Chrome DevTools aç (F12)
2. Lighthouse tab'ına git
3. "Progressive Web App" seç
4. "Generate report" tıkla

### Beklenen Sonuçlar

- ✅ Installable: Pass
- ✅ PWA Optimized: Pass
- ✅ Icons: Pass (192x192 ve 512x512)
- ✅ Maskable icon: Pass
- ✅ Manifest: Pass

## 🎨 Visual Verification

### Icon Kalitesi Kontrolü

1. Icon'ları görsel olarak incele:

```bash
# Windows
start public/icons/icon-512x512.png

# macOS
open public/icons/icon-512x512.png

# Linux
xdg-open public/icons/icon-512x512.png
```

2. Kontrol edilecekler:
   - [ ] Logo net ve keskin
   - [ ] Transparent background korunmuş
   - [ ] Renkler doğru
   - [ ] Bozulma/pixelation yok

### Maskable Icon Kontrolü

1. https://maskable.app/ sitesini aç
2. Icon'u upload et: `public/icons/icon-512x512-maskable.png`
3. Farklı mask şekillerini test et:
   - [ ] Circle (Pixel)
   - [ ] Rounded square (Samsung)
   - [ ] Squircle (iOS)
   - [ ] Square (Windows)

## 🔧 Debugging

### Icon Görünmüyorsa

#### 1. Cache Temizle

```bash
# Browser cache
Ctrl+Shift+Delete (Chrome/Edge)
Cmd+Shift+Delete (Safari)

# Next.js cache
rm -rf .next
npm run build
```

#### 2. Path'leri Kontrol Et

```bash
# Manifest'teki path'leri kontrol et
cat public/manifest.json | grep "src"

# Beklenen format:
# "src": "/icons/icon-192x192.png"
```

#### 3. Build Kontrol Et

```bash
# Production build
npm run build

# Build output'ta icon'ları ara
# Beklenen: Static files içinde /icons/ klasörü
```

#### 4. Network Tab Kontrol Et

1. DevTools > Network tab
2. Sayfayı yenile
3. "icon" filtrele
4. Icon request'lerini kontrol et:
   - [ ] 200 OK status
   - [ ] Doğru content-type (image/png)
   - [ ] Doğru boyut

### Manifest Yüklenmiyor

#### 1. Manifest Path Kontrol

```bash
# Layout.tsx'te manifest path'i kontrol et
grep "manifest" src/app/layout.tsx

# Beklenen:
# manifest: "/manifest.json"
```

#### 2. Manifest Syntax Kontrol

```bash
# JSON syntax'ı kontrol et
cat public/manifest.json | jq .

# Hata varsa gösterir
```

#### 3. MIME Type Kontrol

- DevTools > Network > manifest.json
- Response Headers > Content-Type
- Beklenen: `application/manifest+json` veya `application/json`

## 📊 Performance Check

### Icon Loading Time

1. DevTools > Network tab
2. "Disable cache" aktif et
3. Sayfayı yenile
4. Icon loading time'ları kontrol et:
   - [ ] favicon: < 50ms
   - [ ] icon-192x192: < 100ms
   - [ ] icon-512x512: < 200ms

### Bundle Size Impact

```bash
# Build size'ı kontrol et
npm run build

# Icon'ların static asset olarak export edildiğini kontrol et
# Beklenen: /public/icons/ klasörü .next/static/ içinde
```

## ✅ Final Checklist

### Pre-Production

- [ ] Tüm icon'lar oluşturuldu (14 adet)
- [ ] Favicon.ico oluşturuldu
- [ ] Manifest.json güncellendi
- [ ] Layout.tsx metadata eklendi
- [ ] Build başarılı
- [ ] Lighthouse PWA audit geçti

### Production

- [ ] Icon'lar production'da görünüyor
- [ ] Favicon browser tab'da görünüyor
- [ ] PWA install prompt çalışıyor
- [ ] Mobile'da "Add to home screen" çalışıyor
- [ ] Splash screen doğru görünüyor

### Post-Production

- [ ] Real device test (Android)
- [ ] Real device test (iOS)
- [ ] Different browsers test
- [ ] Performance monitoring
- [ ] User feedback

## 🎉 Success Criteria

Tüm aşağıdakiler sağlanmalı:

1. ✅ **Visibility:** Icon'lar tüm platformlarda görünüyor
2. ✅ **Quality:** Icon'lar net ve keskin
3. ✅ **Performance:** Loading time < 200ms
4. ✅ **PWA:** Lighthouse audit 100/100
5. ✅ **Compatibility:** Tüm major browsers destekleniyor
6. ✅ **Mobile:** Add to home screen çalışıyor

## 📞 Support

Sorun yaşarsanız:

1. **Dokümantasyon:** `docs/PWA-ICONS-SETUP.md`
2. **Implementation:** `PWA-ICONS-IMPLEMENTATION-SUMMARY.md`
3. **Script:** `scripts/generate-icons.js`
4. **Regenerate:** `npm run generate:icons`

---

**Son Güncelleme:** 2025-01-31  
**Versiyon:** 1.0.0
