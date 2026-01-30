# ☁️ Cloudflare DNS Kurulumu - Optimus Vet

## 📋 Gerekli Bilgiler

- **Domain**: `celilturan.com.tr`
- **Subdomain**: `optimus.celilturan.com.tr`
- **Coolify Sunucu IP**: `[COOLIFY_SUNUCU_IP_ADRESI]` (Coolify'dan öğren)

---

## 🔍 Adım 1: Coolify Sunucu IP Adresini Öğren

### Coolify Dashboard'dan:

1. Coolify'a giriş yap
2. **Settings** → **Server** → **IP Address** bölümüne bak
3. IP adresini kopyala (örn: `123.456.789.012`)

### Veya Terminal'den:

```bash
# Coolify sunucusuna SSH ile bağlan
ssh root@[COOLIFY_SUNUCU_IP]

# Public IP'yi öğren
curl ifconfig.me
# veya
hostname -I | awk '{print $1}'
```

**IP Adresini not al!** Örnek: `77.42.68.4` (veya farklı bir IP)

---

## ☁️ Adım 2: Cloudflare DNS Ayarları

### 2.1. Cloudflare'e Giriş Yap

1. https://dash.cloudflare.com adresine git
2. Giriş yap
3. **celilturan.com.tr** domain'ini seç

### 2.2. DNS Kaydı Ekle

**DNS** sekmesine git ve **Add record** butonuna tıkla:

#### Seçenek 1: A Record (Önerilen)

```
Type: A
Name: optimus
IPv4 address: [COOLIFY_SUNUCU_IP]
Proxy status: ✅ Proxied (Turuncu bulut)
TTL: Auto
```

**Örnek:**

```
Type: A
Name: optimus
IPv4 address: 77.42.68.4
Proxy status: ✅ Proxied
TTL: Auto
```

#### Seçenek 2: CNAME Record (Alternatif)

Eğer Coolify'ın kendi domain'i varsa:

```
Type: CNAME
Name: optimus
Target: [COOLIFY_DOMAIN]
Proxy status: ✅ Proxied
TTL: Auto
```

**Örnek:**

```
Type: CNAME
Name: optimus
Target: coolify.yourserver.com
Proxy status: ✅ Proxied
TTL: Auto
```

### 2.3. Kaydet

**Save** butonuna tıkla.

---

## 🔒 Adım 3: Cloudflare SSL/TLS Ayarları

### 3.1. SSL/TLS Modu

1. Cloudflare'de **SSL/TLS** sekmesine git
2. **Overview** altında encryption mode'u seç:

**Önerilen Mod: Full (strict)**

```
Off                  ❌ Kullanma
Flexible             ❌ Kullanma (güvensiz)
Full                 ⚠️ Kullanılabilir
Full (strict)        ✅ ÖNERİLEN (en güvenli)
```

**Full (strict)** seçeneğini işaretle.

### 3.2. Always Use HTTPS

1. **SSL/TLS** → **Edge Certificates** sekmesine git
2. **Always Use HTTPS**: ✅ Aktif et
3. **Automatic HTTPS Rewrites**: ✅ Aktif et

### 3.3. Minimum TLS Version

**TLS 1.2** veya **TLS 1.3** seç (önerilen: TLS 1.2)

---

## 🚀 Adım 4: Cloudflare Firewall & Security

### 4.1. Firewall Rules (Opsiyonel)

**Security** → **WAF** sekmesine git:

- **Managed Rules**: ✅ Aktif (DDoS koruması)
- **Rate Limiting**: İsteğe bağlı (çok fazla istek engellemek için)

### 4.2. Bot Fight Mode

**Security** → **Bots** sekmesine git:

- **Bot Fight Mode**: ✅ Aktif (bot saldırılarını engeller)

---

## 🔄 Adım 5: Coolify'da Domain Ayarları

### 5.1. Coolify Dashboard

1. Coolify'a giriş yap
2. **optimus-vet** uygulamasını seç
3. **Domains** sekmesine git

### 5.2. Domain Ekle

```
Domain: optimus.celilturan.com.tr
```

**Add Domain** butonuna tıkla.

### 5.3. SSL Certificate

Coolify otomatik olarak Let's Encrypt sertifikası oluşturacak:

- **Generate SSL Certificate**: ✅ Otomatik
- **Force HTTPS**: ✅ Aktif et

**Not:** Cloudflare Proxied modunda olduğu için, Coolify'ın SSL sertifikası Cloudflare ile iletişim için kullanılır.

---

## ✅ Adım 6: DNS Propagation Kontrolü

DNS değişikliklerinin yayılması 5-10 dakika sürebilir.

### 6.1. DNS Kontrolü

Terminal'den kontrol et:

```bash
# A record kontrolü
nslookup turan.aihaberleri.org

# Dig ile detaylı kontrol
dig turan.aihaberleri.org

# Ping testi
ping turan.aihaberleri.org
```

**Beklenen Çıktı:**

```
turan.aihaberleri.org has address [COOLIFY_SUNUCU_IP]
```

### 6.2. Online DNS Checker

https://dnschecker.org adresine git:

1. `turan.aihaberleri.org` yaz
2. **A** record seç
3. **Search** tıkla
4. Tüm lokasyonlarda IP adresini görmeli

---

## 🧪 Adım 7: Test Et

### 7.1. HTTP Test

Tarayıcıda aç:

```
http://turan.aihaberleri.org
```

Otomatik olarak HTTPS'e yönlendirilmeli.

### 7.2. HTTPS Test

```
https://turan.aihaberleri.org
```

✅ Yeşil kilit simgesi görünmeli (SSL aktif)

### 7.3. Health Check

```
https://turan.aihaberleri.org/api/health
```

**Beklenen Yanıt:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T18:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 🔧 Troubleshooting

### Sorun 1: DNS Çözümlenmiyor

**Hata:** `nslookup` IP adresi göstermiyor

**Çözüm:**

1. Cloudflare DNS kaydını kontrol et (A record doğru mu?)
2. 10-15 dakika bekle (DNS propagation)
3. Cloudflare cache'i temizle: **Caching** → **Purge Everything**

### Sorun 2: SSL Hatası (ERR_SSL_VERSION_OR_CIPHER_MISMATCH)

**Hata:** Tarayıcıda SSL hatası

**Çözüm:**

1. Cloudflare SSL/TLS modunu **Full (strict)** yap
2. Coolify'da SSL sertifikası oluşturuldu mu kontrol et
3. Coolify'da **Regenerate SSL Certificate** tıkla

### Sorun 3: 502 Bad Gateway

**Hata:** Cloudflare 502 hatası veriyor

**Çözüm:**

1. Coolify uygulaması çalışıyor mu kontrol et
2. Coolify logs'u kontrol et
3. Port 3002 açık mı kontrol et:

```bash
# Coolify sunucusunda
netstat -tulpn | grep 3002
```

### Sorun 4: Cloudflare Proxy Hatası

**Hata:** Cloudflare proxy çalışmıyor

**Çözüm:**

1. DNS kaydında **Proxy status** turuncu bulut olmalı (✅ Proxied)
2. Gri bulut ise tıklayıp turuncu yap
3. Cloudflare SSL/TLS modu **Full (strict)** olmalı

### Sorun 5: Redirect Loop (Too Many Redirects)

**Hata:** Sonsuz yönlendirme döngüsü

**Çözüm:**

1. Cloudflare SSL/TLS modunu **Full** veya **Full (strict)** yap
2. **Flexible** modunda ise değiştir
3. Coolify'da **Force HTTPS** kapalı olmalı (Cloudflare zaten zorluyor)

---

## 📊 Cloudflare Analytics

### Trafik İzleme

**Analytics** sekmesinde:

- Ziyaretçi sayısı
- Bandwidth kullanımı
- Engellenen tehditler
- Cache hit rate

### Performance

**Speed** → **Optimization** sekmesinde:

- **Auto Minify**: ✅ JavaScript, CSS, HTML
- **Brotli**: ✅ Aktif
- **Rocket Loader**: ⚠️ Opsiyonel (bazen sorun çıkarabilir)

---

## 🎯 Önerilen Cloudflare Ayarları

### Güvenlik (Security)

```
✅ Always Use HTTPS
✅ Automatic HTTPS Rewrites
✅ Bot Fight Mode
✅ WAF Managed Rules
✅ DDoS Protection (otomatik)
```

### Performance

```
✅ Auto Minify (JS, CSS, HTML)
✅ Brotli Compression
✅ HTTP/2
✅ HTTP/3 (QUIC)
✅ 0-RTT Connection Resumption
```

### Caching

```
Browser Cache TTL: 4 hours
Caching Level: Standard
```

### Network

```
✅ WebSockets (Coolify için gerekli)
✅ gRPC
✅ IPv6 Compatibility
```

---

## 📝 Özet Checklist

Deployment öncesi kontrol et:

- [ ] Coolify sunucu IP adresi öğrenildi
- [ ] Cloudflare'de A record eklendi (`optimus` → IP)
- [ ] Proxy status: ✅ Proxied (turuncu bulut)
- [ ] SSL/TLS mode: **Full (strict)**
- [ ] Always Use HTTPS: ✅ Aktif
- [ ] Coolify'da domain eklendi (`turan.aihaberleri.org`)
- [ ] Coolify SSL certificate oluşturuldu
- [ ] DNS propagation tamamlandı (5-10 dakika)
- [ ] `https://turan.aihaberleri.org` açılıyor
- [ ] Health check çalışıyor (`/api/health`)

---

## 🎉 Başarılı Deployment!

Tüm adımlar tamamlandığında:

✅ **Domain**: `https://turan.aihaberleri.org`
✅ **SSL**: Let's Encrypt + Cloudflare
✅ **DDoS Protection**: Cloudflare
✅ **CDN**: Cloudflare Edge Network
✅ **Performance**: Optimized
✅ **Security**: WAF + Bot Protection

**Artık sistem production'da çalışıyor!** 🚀

---

## 📞 Destek

Sorun yaşarsan:

1. Cloudflare logs: **Analytics** → **Logs**
2. Coolify logs: **Logs** sekmesi
3. DNS checker: https://dnschecker.org
4. SSL checker: https://www.ssllabs.com/ssltest/

**İyi çalışmalar!** 🎊
