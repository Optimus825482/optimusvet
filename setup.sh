#!/bin/bash

# OPTIMUS VETERINER ON MUHASEBE - Setup & Deployment Script

echo "🚀 OPTIMUS VETERINER ON MUHASEBE - Otomatik Setup"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Node.js
echo -e "${BLUE}✓ Node.js versiyonu kontrol ediliyor...${NC}"
node_version=$(node -v)
echo "  Node.js: $node_version"

# 2. Install dependencies
echo ""
echo -e "${BLUE}✓ Dependencies yükleniyor...${NC}"
npm install

# 3. Setup environment
echo ""
echo -e "${BLUE}✓ Environment ayarlanıyor...${NC}"
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "  ✓ .env.local oluşturuldu"
else
    echo "  ✓ .env.local zaten var"
fi

# 4. Database setup
echo ""
echo -e "${BLUE}✓ Database kurulumu...${NC}"
if command -v docker &> /dev/null; then
    echo "  ✓ Docker bulundu - PostgreSQL container başlatılıyor..."
    docker run --name optimus-db \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=optimusvet \
        -p 5432:5432 \
        -d postgres:16 2>/dev/null || echo "  ℹ Container zaten çalışıyor"
    sleep 2
fi

# 5. Run migrations
echo ""
echo -e "${BLUE}✓ Database migrations çalıştırılıyor...${NC}"
npm run db:migrate

# 6. Seed data
echo ""
read -p "Demo veri eklemek ister misiniz? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}✓ Demo veri ekleniyor...${NC}"
    npm run db:seed
fi

# 7. Summary
echo ""
echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
echo ""
echo "🎯 Sonraki adımlar:"
echo "  1. npm run dev      - Dev server'ı başlat"
echo "  2. http://localhost:3000 - Tarayıcıda aç"
echo "  3. admin@optimusvet.com / admin123 - Test credentials"
echo ""
echo "📚 Dokümantasyon:"
echo "  - README.md       - Kapsamlı kılavuz"
echo "  - QUICKSTART.md   - Hızlı başlangıç"
echo "  - DEPLOYMENT.md   - Production deployment"
echo "  - QA-CHECKLIST.md - Test checklist"
echo ""
echo "🎉 Sistem ayağa kalktı!"
