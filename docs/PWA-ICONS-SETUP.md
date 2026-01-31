# PWA Icons Yapılandırması

## 📱 Genel Bakış

Optimus Vet uygulaması için logo.png dosyasından tüm PWA icon'ları otomatik olarak oluşturulmuştur.

## 🎨 Oluşturulan Icon'lar

### Favicon (Browser Tab Icons)

- `favicon.ico` - 32x32 (multi-size)
- `favicon-16x16.png` - 16x16
- `favicon-32x32.png` - 32x32
- `favicon-48x48.png` - 48x48

### Apple Touch Icon

- `apple-touch-icon.png` - 180x180 (iOS home screen)

### PWA Manifest Icons

- `icon-72x72.png` - 72x72
- `icon-96x96.png` - 96x96
- `icon-128x128.png` - 128x128
- `icon-144x144.png` - 144x144
- `icon-152x152.png` - 152x152
- `icon-192x192.png` - 192x192 (Android home screen)
- `icon-384x384.png` - 384x384
- `icon-512x512.png` - 512x512 (Splash screen)

### Maskable Icons (Safe Area)

- `icon-192x192-maskable.png` - 192x192 (%10 padding)
- `icon-512x512-maskable.png` - 512x512 (%10 padding)

## 📂 Dosya Konumları

```
optimus-vet/
├── public/
│   ├── favicon.ico                    # Root favicon
│   ├── logo.png                       # Kaynak logo
│   ├── manifest.json                  # PWA manifest
│   └── icons/                         # Tüm icon'lar
│       ├── favicon-16x16.png
│       ├── favicon-32x32.png
│       ├── favicon-48x48.png
│       ├── apple-touch-icon.png
│       ├── icon-72x72.png
│       ├── icon-96x96.png
│       ├── icon-128x128.png
│       ├── icon-144x144.png
│       ├── icon-152x152.png
│       ├── icon-192x192.png
│       ├── icon-384x384.png
│       ├── icon-512x512.png
│       ├── icon-192x192-maskable.png
│       └── icon-512x512-maskable.png
└── scripts/
    └── generate-icons.js              # Icon generator script
```

## 🔧 Icon'ları Yeniden Oluşturma

Logo değiştiğinde icon'ları yeniden oluşturmak için:

```bash
npm run generate:icons
```

Bu komut:

1. `public/logo.png` dosyasını okur
2. Tüm gerekli boyutlarda icon'lar oluşturur
3. Transparent background korur
4. Maskable icon'lar için theme color background ekler
5. Favicon.ico oluşturur

## 📱 PWA Manifest Yapılandırması

`public/manifest.json` dosyası tüm icon referanslarını içerir:

```json
{
  "name": "Optimus Veteriner Ön Muhasebe",
  "short_name": "OptimusVet",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## 🎯 Next.js Metadata Yapılandırması

`src/app/layout.tsx` dosyasında icon metadata'sı tanımlanmıştır:

```typescript
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      { rel: "icon", url: "/favicon.ico" },
      {
        rel: "icon",
        url: "/icons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/icons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
};
```

## ✅ Test Checklist

### Browser Test

- [ ] Chrome: Favicon görünüyor mu?
- [ ] Firefox: Favicon görünüyor mu?
- [ ] Safari: Favicon görünüyor mu?
- [ ] Edge: Favicon görünüyor mu?

### Mobile Test

- [ ] Android Chrome: "Add to Home Screen" icon doğru mu?
- [ ] iOS Safari: "Add to Home Screen" icon doğru mu?
- [ ] Splash screen doğru görünüyor mu?

### PWA Test

- [ ] Lighthouse PWA audit geçiyor mu?
- [ ] Manifest.json doğru yükleniyor mu?
- [ ] Maskable icon'lar safe area'da mı?

## 🔍 Debugging

### Icon'lar görünmüyorsa:

1. **Cache temizle:**

```bash
# Browser cache
Ctrl+Shift+Delete (Chrome/Edge)
Cmd+Shift+Delete (Safari)

# Next.js cache
rm -rf .next
npm run build
```

2. **Path'leri kontrol et:**

```bash
# Icon'ların varlığını kontrol et
ls public/icons/

# Manifest'i kontrol et
cat public/manifest.json
```

3. **Build sonrası kontrol et:**

```bash
npm run build
npm start
# http://localhost:3002 adresini aç
```

4. **Lighthouse audit çalıştır:**

- Chrome DevTools > Lighthouse
- "Progressive Web App" seç
- "Generate report" tıkla

## 📊 Icon Boyutları ve Kullanım Alanları

| Boyut   | Kullanım Alanı         | Dosya                |
| ------- | ---------------------- | -------------------- |
| 16x16   | Browser tab (small)    | favicon-16x16.png    |
| 32x32   | Browser tab (standard) | favicon-32x32.png    |
| 48x48   | Browser tab (large)    | favicon-48x48.png    |
| 72x72   | Android Chrome         | icon-72x72.png       |
| 96x96   | Android Chrome         | icon-96x96.png       |
| 128x128 | Android Chrome         | icon-128x128.png     |
| 144x144 | Windows tile           | icon-144x144.png     |
| 152x152 | iOS Safari             | icon-152x152.png     |
| 180x180 | iOS home screen        | apple-touch-icon.png |
| 192x192 | Android home screen    | icon-192x192.png     |
| 384x384 | Android splash         | icon-384x384.png     |
| 512x512 | Android splash (large) | icon-512x512.png     |

## 🎨 Maskable Icons Nedir?

Maskable icon'lar, farklı cihazlarda farklı şekillerde (daire, kare, yuvarlatılmış köşe) görünebilen icon'lardır.

**Safe Area:** Icon'un %80'i (ortadaki kısım) her zaman görünür. Bu yüzden maskable icon'lara %10 padding ekliyoruz.

**Örnek:**

- Pixel: Daire şeklinde mask
- Samsung: Yuvarlatılmış köşe
- iOS: Yuvarlatılmış kare

## 🚀 Production Deployment

Production'a deploy etmeden önce:

1. ✅ Icon'lar oluşturuldu
2. ✅ Manifest.json güncellendi
3. ✅ Layout.tsx güncellendi
4. ✅ Build başarılı
5. ✅ PWA test edildi

## 📚 Kaynaklar

- [PWA Icons Guide](https://web.dev/add-manifest/)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [Next.js Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

## 🔄 Güncelleme Geçmişi

- **2025-01-31:** İlk PWA icon yapılandırması tamamlandı
  - Logo.png'den tüm icon'lar oluşturuldu
  - Manifest.json güncellendi
  - Layout.tsx metadata eklendi
  - Generate script oluşturuldu
