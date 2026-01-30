@echo off
echo.
echo ============================================================
echo OPTIMUS VETERINER ON MUHASEBE - Otomatik Setup
echo ============================================================
echo.

REM Colors (Windows 10+ için)
for /F %%A in ('echo prompt $H ^| cmd') do set "BS=%%A"

REM 1. Check Node.js
echo [*] Node.js versiyonu kontrol ediliyor...
node -v

REM 2. Install dependencies
echo.
echo [*] Dependencies yükleniyor...
call npm install
if errorlevel 1 (
    echo [ERROR] Dependencies yükleme hatası!
    pause
    exit /b 1
)

REM 3. Setup environment
echo.
echo [*] Environment ayarlanıyor...
if not exist .env.local (
    copy .env.example .env.local
    echo [OK] .env.local oluşturuldu
) else (
    echo [OK] .env.local zaten var
)

REM 4. Database setup (Docker)
echo.
echo [*] Database kurulumu...
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker bulundu - PostgreSQL container başlatılıyor...
    docker run --name optimus-db ^
        -e POSTGRES_PASSWORD=postgres ^
        -e POSTGRES_DB=optimusvet ^
        -p 5432:5432 ^
        -d postgres:16
) else (
    echo [WARNING] Docker bulunamadı
    echo PostgreSQL'i manuel olarak başlat veya Docker yükle
)

REM 5. Run migrations
echo.
echo [*] Database migrations çalıştırılıyor...
call npm run db:migrate
if errorlevel 1 (
    echo [WARNING] Migration hatası - veritabanı bağlantısını kontrol et
)

REM 6. Seed data (optional)
echo.
set /p seed="Demo veri eklemek ister misiniz? (y/n): "
if /i "%seed%"=="y" (
    echo [*] Demo veri ekleniyor...
    call npm run db:seed
)

REM 7. Summary
echo.
echo ============================================================
echo [SUCCESS] Kurulum tamamlandı!
echo ============================================================
echo.
echo [!] Sonraki adımlar:
echo     1. npm run dev            - Dev server'ı başlat
echo     2. http://localhost:3000  - Tarayıcıda aç
echo     3. admin@optimusvet.com / admin123 - Test credentials
echo.
echo [!] Dokümantasyon:
echo     - README.md       - Kapsamlı kılavuz
echo     - QUICKSTART.md   - Hızlı başlangıç
echo     - DEPLOYMENT.md   - Production deployment
echo     - QA-CHECKLIST.md - Test checklist
echo.
echo [!] Sistem ayağa kalktı!
echo.
pause
