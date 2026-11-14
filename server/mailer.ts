import nodemailer from 'nodemailer';
import { db, OWNER_ADMIN_EMAIL } from './db.ts';

export type SecurityEventType =
  | 'register_member'
  | 'register_advisor'
  | 'advisor_approved'
  | 'login_success'
  | 'multiple_failed_attempts'
  | 'password_reset_requested'
  | 'new_order'
  | 'payment_success'
  | 'payment_failed'
  | 'order_cancelled'
  | 'refund_requested'
  | 'new_enquiry'
  | 'security_alert';

export interface OwnerSecurityNotificationPayload {
  eventType: SecurityEventType;
  accountType: 'Advisor' | 'Member' | 'Admin' | 'Customer' | 'System';
  fullName: string;
  email: string;
  phone?: string;
  ipAddress?: string;
  deviceInfo?: string;
  extraNote?: string;
}

const EVENT_LABELS: Record<SecurityEventType, string> = {
  register_member: 'New Customer / Member Registration',
  register_advisor: 'New Advisor Registration Request (Pending Approval)',
  advisor_approved: 'Advisor Account Approved by Owner',
  login_success: 'Successful Account Login',
  multiple_failed_attempts: 'Security Alert: Multiple Failed Login Attempts',
  password_reset_requested: 'Password Reset Requested',
  new_order: 'New E-Commerce Order Placed',
  payment_success: 'Successful Payment Verified',
  payment_failed: 'Failed Payment Attempt',
  order_cancelled: 'Order Cancelled',
  refund_requested: 'Customer Refund Request Submitted',
  new_enquiry: 'New Customer Support / Consultation Enquiry',
  security_alert: 'Important Owner Security / DPDP Event',
};

export function getMailerConfigStatus() {
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
  const hasSmtp = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
  return {
    configured: hasResend || hasSmtp,
    provider: hasResend ? 'resend' : hasSmtp ? 'smtp' : 'none',
    ownerNotificationEmail: OWNER_ADMIN_EMAIL,
  };
}

async function dispatchEmail(to: string, subject: string, html: string, text: string): Promise<{ status: 'sent' | 'failed' | 'not_configured'; provider: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.RESEND_FROM_EMAIL?.trim() || process.env.SMTP_FROM?.trim() || 'DNA GENEIE Security <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
          text,
        }),
      });
      if (!response.ok) {
        const errBody = await response.text();
        return { status: 'failed', provider: 'resend', error: `Resend HTTP ${response.status}: ${errBody.slice(0, 200)}` };
      }
      return { status: 'sent', provider: 'resend' };
    } catch (err) {
      return { status: 'failed', provider: 'resend', error: err instanceof Error ? err.message : 'Resend request error' };
    }
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT || '587');
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM?.trim() || smtpUser,
        to,
        subject,
        text,
        html,
      });
      return { status: 'sent', provider: 'smtp' };
    } catch (err) {
      return { status: 'failed', provider: 'smtp', error: err instanceof Error ? err.message : 'SMTP send error' };
    }
  }

  return {
    status: 'not_configured',
    provider: 'none',
    error: 'Missing RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS environment variables.',
  };
}

export async function notifyOwnerSecurityEvent(payload: OwnerSecurityNotificationPayload): Promise<void> {
  const recipient = OWNER_ADMIN_EMAIL;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr =
    now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }) + ' IST';

  const eventLabel = EVENT_LABELS[payload.eventType] || payload.eventType;
  const subject = `[DNA GENEIE] ${eventLabel} — ${payload.fullName}`;

  const text = [
    `DNA GENEIE — Business & Security Notification`,
    `Event: ${eventLabel}`,
    `Account / Actor Type: ${payload.accountType}`,
    `Name: ${payload.fullName}`,
    `Email: ${payload.email}`,
    `Phone Number: ${payload.phone || 'Not provided'}`,
    `Date: ${dateStr}`,
    `Time: ${timeStr}`,
    `Device / Browser: ${payload.deviceInfo || 'Unavailable'}`,
    `IP Address: ${payload.ipAddress || 'Unavailable'}`,
    payload.extraNote ? `Details: ${payload.extraNote}` : '',
    ``,
    `Security notice: Passwords, hashes, OTPs, session tokens, and full payment card numbers are never transmitted in notifications.`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0B2246 0%, #0D9488 100%); padding: 20px 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px;">DNA GENEIE — Business & Security Notification</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Wellness from within</p>
      </div>
      <div style="padding: 24px; background: #ffffff; color: #0f172a;">
        <p style="margin-top: 0; font-weight: 600; font-size: 15px; color: #0B2246;">${escapeHtml(eventLabel)}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 160px;">Account Type</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(payload.accountType)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Name</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9;">${escapeHtml(payload.fullName)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Email Address</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9;">${escapeHtml(payload.email)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Phone Number</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9;">${escapeHtml(payload.phone || 'Not provided')}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Date & Time</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9;">${escapeHtml(dateStr)} · ${escapeHtml(timeStr)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Device / Browser</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9; font-size: 12px;">${escapeHtml(payload.deviceInfo || 'Unavailable')}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">IP Address</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9; font-family: monospace;">${escapeHtml(payload.ipAddress || 'Unavailable')}</td></tr>
          ${payload.extraNote ? `<tr><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">Details</td><td style="padding: 8px 0; border-top: 1px solid #f1f5f9;">${escapeHtml(payload.extraNote)}</td></tr>` : ''}
        </table>
        <p style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          Security notice: Passwords, hashes, OTPs, session tokens, and full payment card numbers are strictly excluded from all notifications.
        </p>
      </div>
    </div>
  `;

  const ownerRow = db
    .prepare("SELECT email_verified FROM users WHERE role = 'admin' AND lower(email) = ?")
    .get(recipient) as { email_verified: number } | undefined;

  const result =
    ownerRow && ownerRow.email_verified === 1
      ? await dispatchEmail(recipient, subject, html, text)
      : {
          status: 'failed' as const,
          provider: 'none',
          error: 'Official owner email ownership verification is pending.',
        };

  db.prepare(`
    INSERT INTO email_notifications (recipient, subject, event_type, account_type, full_name, account_email, phone, delivery_status, provider, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    recipient,
    subject,
    payload.eventType,
    payload.accountType,
    payload.fullName,
    payload.email,
    payload.phone || '',
    result.status,
    result.provider,
    result.error || ''
  );
}

export async function sendUserTransactionalEmail(to: string, subject: string, heading: string, bodyParagraphs: string[], actionLabel?: string, actionUrl?: string): Promise<{ status: 'sent' | 'failed' | 'not_configured'; provider: string; error?: string }> {
  const text = [
    heading,
    '',
    ...bodyParagraphs,
    actionUrl ? `\n${actionLabel || 'Open Link'}: ${actionUrl}` : '',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0B2246 0%, #0D9488 100%); padding: 20px 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 18px;">DNA GENEIE</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Wellness from within</p>
      </div>
      <div style="padding: 24px; background: #ffffff; color: #0f172a;">
        <h3 style="margin-top: 0; color: #0B2246;">${escapeHtml(heading)}</h3>
        ${bodyParagraphs.map((p) => `<p style="line-height: 1.6; color: #334155;">${escapeHtml(p)}</p>`).join('')}
        ${
          actionUrl
            ? `<p style="margin: 24px 0;"><a href="${escapeHtml(actionUrl)}" style="display: inline-block; padding: 12px 20px; background: #0B2246; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${escapeHtml(actionLabel || 'Continue')}</a></p>`
            : ''
        }
      </div>
    </div>
  `;

  return dispatchEmail(to, subject, html, text);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
