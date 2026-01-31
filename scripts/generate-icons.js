/**
 * PWA Icon Generator Script
 * Logo.png'den tüm gerekli PWA icon boyutlarını oluşturur
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Icon boyutları ve dosya isimleri
const ICON_SIZES = [
  // Favicon sizes
  { size: 16, name: "favicon-16x16.png" },
  { size: 32, name: "favicon-32x32.png" },
  { size: 48, name: "favicon-48x48.png" },

  // Apple Touch Icon
  { size: 180, name: "apple-touch-icon.png" },

  // PWA Manifest Icons
  { size: 72, name: "icon-72x72.png" },
  { size: 96, name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },
  { size: 192, name: "icon-192x192.png" },
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },
];

// Maskable icon boyutları (PWA için önemli)
const MASKABLE_SIZES = [
  { size: 192, name: "icon-192x192-maskable.png" },
  { size: 512, name: "icon-512x512-maskable.png" },
];

const INPUT_LOGO = path.join(__dirname, "../public/logo.png");
const OUTPUT_DIR = path.join(__dirname, "../public/icons");

async function generateIcons() {
  try {
    // Icons klasörünü oluştur
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log("✅ Icons klasörü oluşturuldu");
    }

    // Logo dosyasını kontrol et
    if (!fs.existsSync(INPUT_LOGO)) {
      throw new Error("❌ Logo.png dosyası bulunamadı!");
    }

    console.log("🎨 Logo.png bulundu, iconlar oluşturuluyor...\n");

    // Standart icon'ları oluştur
    for (const { size, name } of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, name);

      await sharp(INPUT_LOGO)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ ${name} (${size}x${size}) oluşturuldu`);
    }

    // Maskable iconları oluştur (padding ile)
    console.log("\n🎭 Maskable iconlar oluşturuluyor...\n");

    for (const { size, name } of MASKABLE_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, name);
      const padding = Math.floor(size * 0.1); // %10 padding
      const innerSize = size - padding * 2;

      await sharp(INPUT_LOGO)
        .resize(innerSize, innerSize, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 16, g: 185, b: 129, alpha: 1 }, // Theme color background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ ${name} (${size}x${size} maskable) oluşturuldu`);
    }

    // Favicon.ico oluştur (multi-size)
    console.log("\n🔖 Favicon.ico oluşturuluyor...\n");

    const faviconPath = path.join(__dirname, "../public/favicon.ico");
    await sharp(INPUT_LOGO)
      .resize(32, 32, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toFile(faviconPath);

    console.log("✅ favicon.ico oluşturuldu");

    console.log("\n🎉 Tüm iconlar başarıyla oluşturuldu!");
    console.log(`📁 Konum: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("❌ Hata:", error.message);
    process.exit(1);
  }
}

// Script'i çalıştır
generateIcons();
