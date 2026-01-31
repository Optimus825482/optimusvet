# Auth Debug - 401 Hatası Çözümü

## Problem

`/api/user/profile` endpoint'i 401 (Unauthorized) hatası veriyor.

## Kontrol Edilecekler

### 1. Login Durumu

- Kullanıcı login olmuş mu?
- Dashboard'a erişebiliyor mu?
- Header'da kullanıcı adı görünüyor mu?

### 2. Session Cookie

Browser DevTools > Application > Cookies'de kontrol et:

- `authjs.session-token` (production)
- `__Secure-authjs.session-token` (HTTPS)
- Cookie var mı? Expire olmamış mı?

### 3. Console Logs

Terminal'de şu logları kontrol et:

```
Profile API - Session: ...
Profile API - User ID: ...
```

## Olası Çözümler

### Çözüm 1: Yeniden Login

1. Logout yap
2. Tekrar login ol
3. Profile sayfasına git

### Çözüm 2: Cookie Domain

`.env` dosyasında:

```
AUTH_URL="http://localhost:3002"
```

Port numarası doğru mu?

### Çözüm 3: NextAuth v5 Route Handler

Route handler'ı export etmek gerekebilir:

```typescript
export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = req.auth;
  // ...
});
```

### Çözüm 4: Middleware Auth Check

Middleware'de auth kontrolü ekle (opsiyonel).

## Test Adımları

1. **Browser Console'da Session Kontrol:**

```javascript
fetch("/api/auth/session")
  .then((r) => r.json())
  .then(console.log);
```

2. **Cookies Kontrol:**

- DevTools > Application > Cookies
- `authjs.session-token` var mı?

3. **Terminal Logs:**

- `npm run dev` çıktısında "Profile API" logları var mı?

4. **Manual Test:**

```bash
# Terminal'de
curl -v http://localhost:3002/api/user/profile \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE"
```
