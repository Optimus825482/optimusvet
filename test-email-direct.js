/**
 * DIRECT EMAIL TEST
 *
 * Bu script email sistemini doğrudan test eder
 * Node.js ile çalıştırın: node test-email-direct.js
 */

const nodemailer = require("nodemailer");

const EMAIL_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "ikinciyenikitap54@gmail.com",
    pass: "fsft gfby uvip rarh",
  },
};

const ADMIN_EMAIL = "ikinciyenikitap54@gmail.com";

async function testEmail() {
  console.log("🔍 Email sistemi test ediliyor...\n");

  try {
    // 1. Transporter oluştur
    console.log("1️⃣ Email transporter oluşturuluyor...");
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);
    console.log("✅ Transporter oluşturuldu\n");

    // 2. Bağlantıyı doğrula
    console.log("2️⃣ SMTP bağlantısı doğrulanıyor...");
    await transporter.verify();
    console.log("✅ SMTP bağlantısı başarılı\n");

    // 3. Test email gönder
    console.log("3️⃣ Test email gönderiliyor...");
    const info = await transporter.sendMail({
      from: `"Optimus Vet Test" <${EMAIL_CONFIG.auth.user}>`,
      to: ADMIN_EMAIL,
      subject: "✅ Email Test - Başarılı",
      text: "Bu bir test emailidir. Email sistemi çalışıyor!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <h2 style="color: #667eea;">✅ Email Sistemi Testi</h2>
          <p>Bu bir test emailidir.</p>
          <p><strong>Email sistemi başarıyla çalışıyor!</strong></p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Test Zamanı: ${new Date().toLocaleString("tr-TR")}
          </p>
        </div>
      `,
    });

    console.log("✅ Email başarıyla gönderildi!");
    console.log("📧 Message ID:", info.messageId);
    console.log("📬 Alıcı:", ADMIN_EMAIL);
    console.log("\n🎉 TEST BAŞARILI! Email kutunuzu kontrol edin.\n");
  } catch (error) {
    console.error("❌ EMAIL TEST BAŞARISIZ!\n");
    console.error("Hata:", error.message);

    if (error.code === "EAUTH") {
      console.error("\n⚠️  Kimlik doğrulama hatası!");
      console.error("Çözüm:");
      console.error('1. Gmail hesabınızda "2-Step Verification" açık olmalı');
      console.error('2. "App Password" oluşturmalısınız');
      console.error("3. App Password'ü .env dosyasına eklemelisiniz");
    } else if (error.code === "ECONNECTION") {
      console.error("\n⚠️  Bağlantı hatası!");
      console.error("Çözüm:");
      console.error("1. İnternet bağlantınızı kontrol edin");
      console.error("2. Firewall ayarlarını kontrol edin");
      console.error("3. SMTP port 587'nin açık olduğundan emin olun");
    }

    console.error("\nDetaylı hata:");
    console.error(error);
  }
}

// Test'i çalıştır
testEmail();
