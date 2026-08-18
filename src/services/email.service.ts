import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getPlatformSettings } from "./platform-settings.service.js";

let transporter: Transporter | null = null;
let transporterKey: string | null = null;
let developmentSmtpConfig: ResolvedSmtpConfig | null = null;

interface ResolvedSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string | undefined;
}

async function resolveSmtpConfig(): Promise<ResolvedSmtpConfig> {
  const settings = await getPlatformSettings();
  const host = settings.smtpHost || process.env.SMTP_HOST || "smtp.ethereal.email";
  const port = settings.smtpPort || parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = settings.smtpSecure ?? process.env.SMTP_SECURE === "true";
  const user = settings.smtpUser || process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_NOT_CONFIGURED: set SMTP_USER and SMTP_PASS before sending production email");
    }
    if (!developmentSmtpConfig) {
      const testAccount = await nodemailer.createTestAccount();
      developmentSmtpConfig = {
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        user: testAccount.user,
        pass: testAccount.pass,
      };
      console.log(`[Email] Development Ethereal account ready for preview messages.`);
    }
    return developmentSmtpConfig;
  }

  return { host, port, secure, user, pass };
}

async function getTransporter(): Promise<Transporter> {
  const config = await resolveSmtpConfig();
  const key = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: config.pass,
  });

  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    transporterKey = key;
    await transporter.verify();
    console.log(`[Email] SMTP transporter ready (${config.host}:${config.port}).`);
  }

  return transporter;
}

/**
 * Bootstrap the mail transporter. Runtime sends re-read the platform SMTP
 * settings, so a SUPER_ADMIN change takes effect without a process restart.
 * SMTP_PASS deliberately remains environment/secrets-manager-only.
 */
export async function initEmailService(): Promise<void> {
  await getTransporter();
}

const APP_NAME = "NotaryHub";
const APP_URL  = process.env.APP_URL || "http://localhost:3000";
const FROM     = process.env.EMAIL_FROM || `"${APP_NAME}" <no-reply@notaryhub.local>`;

// ─── Shared layout wrapper ─────────────────────────────────────────────────

function htmlWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width:560px; margin:40px auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
    .header  { background:#1e3a5f; padding:28px 36px; }
    .header h1 { margin:0; color:#ffffff; font-size:18px; font-weight:700; letter-spacing:-0.3px; }
    .header p  { margin:4px 0 0; color:#93c5fd; font-size:12px; }
    .body    { padding:32px 36px; }
    .body p  { margin:0 0 16px; font-size:14px; color:#374151; line-height:1.6; }
    .btn     { display:inline-block; margin:8px 0 24px; padding:12px 28px; background:#2563eb; color:#ffffff !important; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600; }
    .btn:hover { background:#1d4ed8; }
    .code    { display:inline-block; font-family:monospace; font-size:28px; font-weight:700; letter-spacing:8px; color:#1e3a5f; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 24px; margin:8px 0 24px; }
    .note    { font-size:12px !important; color:#9ca3af !important; }
    .footer  { background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 36px; font-size:11px; color:#9ca3af; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Secure Legal Notarisation Platform</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${APP_NAME}. This email was sent automatically — do not reply.
    </div>
  </div>
</body>
</html>`;
}

// ─── Email: Verify Email ───────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  fullName: string,
  rawToken: string
): Promise<void> {
  const link = `${APP_URL}/api/auth/verify-email?token=${rawToken}`;

  const body = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Welcome to ${APP_NAME}. Please verify your email address to activate your account.</p>
    <a href="${link}" class="btn">Verify Email Address</a>
    <p class="note">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
    <p class="note">Or copy this URL into your browser:<br/>${link}</p>
  `;

  const info = await (await getTransporter()).sendMail({
    from: FROM,
    to,
    subject: `[${APP_NAME}] Verify your email address`,
    html: htmlWrapper("Verify Your Email", body),
    text: `Verify your ${APP_NAME} account:\n\n${link}\n\nThis link expires in 24 hours.`,
  });

  if (process.env.NODE_ENV !== "production") {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`[Email] Verification email preview: ${preview}`);
  }
}

// ─── Email: Password Reset ─────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  rawToken: string
): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${rawToken}`;

  const body = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>We received a request to reset your ${APP_NAME} password.</p>
    <a href="${link}" class="btn">Reset Password</a>
    <p class="note">This link expires in <strong>1 hour</strong>.</p>
    <p class="note">If you did not request a password reset, your account remains secure — no action is needed.</p>
    <p class="note">Or copy this URL into your browser:<br/>${link}</p>
  `;

  const info = await (await getTransporter()).sendMail({
    from: FROM,
    to,
    subject: `[${APP_NAME}] Reset your password`,
    html: htmlWrapper("Reset Your Password", body),
    text: `Reset your ${APP_NAME} password:\n\n${link}\n\nThis link expires in 1 hour.`,
  });

  if (process.env.NODE_ENV !== "production") {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`[Email] Password reset email preview: ${preview}`);
  }
}

// ─── Email: Password Changed Confirmation ─────────────────────────────────

export async function sendPasswordChangedEmail(
  to: string,
  fullName: string
): Promise<void> {
  const body = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Your ${APP_NAME} password was successfully changed.</p>
    <p>If you did not make this change, please <a href="${APP_URL}/forgot-password">reset your password immediately</a> and contact support.</p>
  `;

  await (await getTransporter()).sendMail({
    from: FROM,
    to,
    subject: `[${APP_NAME}] Your password has been changed`,
    html: htmlWrapper("Password Changed", body),
    text: `Your ${APP_NAME} password was changed. If this wasn't you, reset your password immediately.`,
  });
}

// ─── Email: 2FA Enabled Notification ─────────────────────────────────────

export async function sendTwoFactorEnabledEmail(
  to: string,
  fullName: string
): Promise<void> {
  const body = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Two-factor authentication (2FA) has been <strong>enabled</strong> on your ${APP_NAME} account.</p>
    <p>From now on, you will need your authenticator app to log in.</p>
    <p>If you did not enable 2FA, please contact support immediately.</p>
  `;

  await (await getTransporter()).sendMail({
    from: FROM,
    to,
    subject: `[${APP_NAME}] Two-factor authentication enabled`,
    html: htmlWrapper("2FA Enabled", body),
    text: `2FA has been enabled on your ${APP_NAME} account.`,
  });
}

// ─── Email: Notification Delivery ──────────────────────────────────────────

export async function sendNotificationEmail(
  to: string,
  fullName: string,
  title: string,
  notificationBody: string,
  actionUrl?: string | null
): Promise<void> {
  const link = actionUrl ? (actionUrl.startsWith("http") ? actionUrl : `${APP_URL}${actionUrl}`) : APP_URL;

  const body = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p><strong>${title}</strong></p>
    <p>${notificationBody}</p>
    <a href="${link}" class="btn">View in ${APP_NAME}</a>
    <p class="note">You're receiving this because it's an update on your account activity.</p>
  `;

  const info = await (await getTransporter()).sendMail({
    from: FROM,
    to,
    subject: `[${APP_NAME}] ${title}`,
    html: htmlWrapper(title, body),
    text: `${title}\n\n${notificationBody}\n\n${link}`,
  });

  if (process.env.NODE_ENV !== "production") {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`[Email] Notification email preview: ${preview}`);
  }
}
