import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    client = new Resend(apiKey);
  }
  return client;
}

function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured');
  }
  return from;
}

export interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<void> {
  const { to, name, resetUrl, expiresInMinutes } = params;
  const resend = getClient();

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: 'Reset your Ashboard password',
    html: renderPasswordResetHtml({ name, resetUrl, expiresInMinutes }),
    text: renderPasswordResetText({ name, resetUrl, expiresInMinutes }),
  });

  if (error) {
    throw new Error(`Resend rejected password reset email: ${error.message}`);
  }
}

function renderPasswordResetHtml(args: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const { name, resetUrl, expiresInMinutes } = args;
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f7f9; margin:0; padding:32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;">
          <h1 style="margin:0 0 16px; font-size:20px; color:#111;">Reset your password</h1>
          <p style="margin:0 0 16px; color:#374151; line-height:1.6;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px; color:#374151; line-height:1.6;">
            We received a request to reset the password for your Ashboard account. Click the button below to choose a new one. The link expires in ${expiresInMinutes} minutes.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 24px;">
          <a href="${resetUrl}" style="display:inline-block; background:#2563eb; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Reset password</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;">
          <p style="margin:0 0 12px; color:#6b7280; font-size:13px; line-height:1.6;">
            If the button doesn't work, paste this URL into your browser:
          </p>
          <p style="margin:0 0 16px; color:#2563eb; font-size:13px; word-break:break-all;">${resetUrl}</p>
          <p style="margin:0; color:#6b7280; font-size:13px; line-height:1.6;">
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderPasswordResetText(args: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): string {
  const { name, resetUrl, expiresInMinutes } = args;
  return [
    `Hi ${name},`,
    '',
    `We received a request to reset the password for your Ashboard account.`,
    `Open this link to choose a new password (expires in ${expiresInMinutes} minutes):`,
    '',
    resetUrl,
    '',
    `If you didn't request this, you can safely ignore this email — your password won't change.`,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
