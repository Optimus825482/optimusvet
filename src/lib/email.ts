/**
 * EMAIL SERVICE
 *
 * Gmail SMTP ile email gönderimi
 * - Error notifications
 * - System alerts
 * - User notifications
 */

import nodemailer from "nodemailer";

// =====================================================
// EMAIL CONFIGURATION
// =====================================================

const EMAIL_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "ikinciyenikitap54@gmail.com",
    pass: process.env.SMTP_PASS || "fsft gfby uvip rarh",
  },
};

// Admin email for critical notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ikinciyenikitap54@gmail.com";

// =====================================================
// EMAIL TRANSPORTER
// =====================================================

let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log("[EMAIL] Configuration verified successfully");
    return true;
  } catch (error) {
    console.error("[EMAIL] Configuration verification failed:", error);
    return false;
  }
}

// =====================================================
// EMAIL TEMPLATES
// =====================================================

/**
 * Error notification email template
 */
function getErrorEmailTemplate(errorData: {
  code: string;
  message: string;
  severity: string;
  stack?: string;
  component?: string;
  function?: string;
  requestPath?: string;
  requestMethod?: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
  context?: any;
}): { subject: string; html: string; text: string } {
  const severityEmoji =
    {
      LOW: "⚠️",
      MEDIUM: "🟡",
      HIGH: "🔴",
      CRITICAL: "🚨",
    }[errorData.severity] || "❌";

  const subject = `${severityEmoji} [${errorData.severity}] ${errorData.code} - Optimus Vet`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; margin-top: 10px; }
    .severity-LOW { background: #fbbf24; color: #78350f; }
    .severity-MEDIUM { background: #fb923c; color: #7c2d12; }
    .severity-HIGH { background: #ef4444; color: #7f1d1d; }
    .severity-CRITICAL { background: #dc2626; color: white; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #1f2937; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; }
    .section-content { background: white; padding: 12px; border-radius: 4px; border-left: 4px solid #667eea; }
    .code-block { background: #1f2937; color: #f9fafb; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 12px; }
    .footer { background: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 8px; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${severityEmoji} Hata Bildirimi</h1>
      <span class="severity severity-${errorData.severity}">${errorData.severity}</span>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">Hata Detayları</div>
        <div class="section-content">
          <div class="info-grid">
            <div class="info-label">Kod:</div>
            <div class="info-value"><strong>${errorData.code}</strong></div>
            
            <div class="info-label">Mesaj:</div>
            <div class="info-value">${errorData.message}</div>
            
            <div class="info-label">Zaman:</div>
            <div class="info-value">${errorData.timestamp}</div>
            
            ${
              errorData.component
                ? `
            <div class="info-label">Bileşen:</div>
            <div class="info-value">${errorData.component}</div>
            `
                : ""
            }
            
            ${
              errorData.function
                ? `
            <div class="info-label">Fonksiyon:</div>
            <div class="info-value">${errorData.function}</div>
            `
                : ""
            }
          </div>
        </div>
      </div>

      ${
        errorData.requestPath
          ? `
      <div class="section">
        <div class="section-title">İstek Bilgileri</div>
        <div class="section-content">
          <div class="info-grid">
            <div class="info-label">Method:</div>
            <div class="info-value">${errorData.requestMethod || "N/A"}</div>
            
            <div class="info-label">Path:</div>
            <div class="info-value">${errorData.requestPath}</div>
          </div>
        </div>
      </div>
      `
          : ""
      }

      ${
        errorData.userId
          ? `
      <div class="section">
        <div class="section-title">Kullanıcı Bilgileri</div>
        <div class="section-content">
          <div class="info-grid">
            <div class="info-label">User ID:</div>
            <div class="info-value">${errorData.userId}</div>
            
            ${
              errorData.userEmail
                ? `
            <div class="info-label">Email:</div>
            <div class="info-value">${errorData.userEmail}</div>
            `
                : ""
            }
          </div>
        </div>
      </div>
      `
          : ""
      }

      ${
        errorData.stack
          ? `
      <div class="section">
        <div class="section-title">Stack Trace</div>
        <div class="code-block">${errorData.stack.replace(/\n/g, "<br>")}</div>
      </div>
      `
          : ""
      }

      ${
        errorData.context
          ? `
      <div class="section">
        <div class="section-title">Ek Bilgiler</div>
        <div class="code-block">${JSON.stringify(errorData.context, null, 2).replace(/\n/g, "<br>").replace(/ /g, "&nbsp;")}</div>
      </div>
      `
          : ""
      }
    </div>
    
    <div class="footer">
      <p>Bu otomatik bir bildirimdir. Optimus Vet Hata İzleme Sistemi</p>
      <p>Lütfen bu hatayı en kısa sürede inceleyin ve çözün.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
${severityEmoji} HATA BİLDİRİMİ - ${errorData.severity}

Hata Kodu: ${errorData.code}
Mesaj: ${errorData.message}
Zaman: ${errorData.timestamp}
${errorData.component ? `Bileşen: ${errorData.component}` : ""}
${errorData.function ? `Fonksiyon: ${errorData.function}` : ""}

${
  errorData.requestPath
    ? `
İstek Bilgileri:
- Method: ${errorData.requestMethod || "N/A"}
- Path: ${errorData.requestPath}
`
    : ""
}

${
  errorData.userId
    ? `
Kullanıcı Bilgileri:
- User ID: ${errorData.userId}
${errorData.userEmail ? `- Email: ${errorData.userEmail}` : ""}
`
    : ""
}

${
  errorData.stack
    ? `
Stack Trace:
${errorData.stack}
`
    : ""
}

${
  errorData.context
    ? `
Ek Bilgiler:
${JSON.stringify(errorData.context, null, 2)}
`
    : ""
}

---
Bu otomatik bir bildirimdir. Optimus Vet Hata İzleme Sistemi
  `.trim();

  return { subject, html, text };
}

// =====================================================
// EMAIL SENDING FUNCTIONS
// =====================================================

/**
 * Send error notification email
 */
export async function sendErrorNotification(errorData: {
  code: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stack?: string;
  component?: string;
  function?: string;
  requestPath?: string;
  requestMethod?: string;
  userId?: string;
  userEmail?: string;
  context?: any;
}): Promise<boolean> {
  try {
    const transport = getTransporter();

    const { subject, html, text } = getErrorEmailTemplate({
      ...errorData,
      timestamp: new Date().toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul",
        dateStyle: "full",
        timeStyle: "long",
      }),
    });

    const info = await transport.sendMail({
      from: `"Optimus Vet Error Monitor" <${EMAIL_CONFIG.auth.user}>`,
      to: ADMIN_EMAIL,
      subject,
      text,
      html,
    });

    console.log("[EMAIL] Error notification sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send error notification:", error);
    return false;
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(to?: string): Promise<boolean> {
  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: `"Optimus Vet" <${EMAIL_CONFIG.auth.user}>`,
      to: to || ADMIN_EMAIL,
      subject: "✅ Test Email - Optimus Vet",
      text: "Email sistemi başarıyla çalışıyor!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #667eea;">✅ Email Sistemi Testi</h2>
          <p>Bu bir test emailidir.</p>
          <p>Email sistemi başarıyla çalışıyor!</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">Optimus Vet - ${new Date().toLocaleString("tr-TR")}</p>
        </div>
      `,
    });

    console.log("[EMAIL] Test email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send test email:", error);
    return false;
  }
}

/**
 * Send custom email
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<boolean> {
  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: `"Optimus Vet" <${EMAIL_CONFIG.auth.user}>`,
      ...options,
    });

    console.log("[EMAIL] Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    return false;
  }
}

// =====================================================
// BATCH EMAIL SENDING
// =====================================================

/**
 * Send multiple emails (with rate limiting)
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }>,
  delayMs: number = 1000,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const success = await sendEmail(email);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed };
}
