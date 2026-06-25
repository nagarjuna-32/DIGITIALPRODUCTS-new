import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mailtrap.io'; // default for development testing
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '"Digital Vault" <noreply@digitalvault.com>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for others
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send an email notification
 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    // If SMTP credentials aren't set, log email content for debugging in development
    if (!SMTP_USER || !SMTP_PASS) {
      console.log('--- Development Email Log ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: \n${html}`);
      console.log('------------------------------');
      return true;
    }

    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

/**
 * Send receipt and order activation details
 */
export const sendOrderReceiptEmail = async (
  to: string,
  userName: string,
  orderId: string,
  amount: number,
  accessType: string,
  categoryName?: string
): Promise<boolean> => {
  const accessDetail =
    accessType === 'FULL_VAULT'
      ? 'Full Vault Access (All Categories)'
      : `Single Category Access: ${categoryName}`;

  const subject = `Your Order Receipt - ${orderId} | Digital Vault`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #121212; color: #ffffff;">
      <h2 style="color: #6366f1; text-align: center; font-size: 24px; margin-bottom: 20px;">Digital Vault</h2>
      <p>Hello ${userName},</p>
      <p>Thank you for your purchase! Your payment has been successfully verified, and your digital access is now active.</p>
      
      <div style="background-color: #1e1e1e; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #818cf8; border-bottom: 1px solid #333; padding-bottom: 5px;">Order Details</h3>
        <table style="width: 100%; text-align: left; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0; color: #999;">Order ID:</td>
            <td style="padding: 5px 0; font-weight: bold;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #999;">Plan Activated:</td>
            <td style="padding: 5px 0; font-weight: bold;">${accessDetail}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #999;">Amount Paid:</td>
            <td style="padding: 5px 0; font-weight: bold; color: #10b981;">₹${amount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to User Dashboard</a>
      </p>

      <p style="font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #333; padding-top: 15px; text-align: center;">
        If you have any questions, please create a ticket in your dashboard.
        <br>&copy; 2026 Digital Vault. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail(to, subject, html);
};
