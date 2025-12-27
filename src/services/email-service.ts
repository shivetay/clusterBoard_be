import crypto from 'crypto';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

type TEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

type TInvitationEmailData = {
  inviteeEmail: string;
  projectName: string;
  inviterName?: string;
  invitationLink: string;
  message?: string;
};

const DEFAULT_PORT_NUMBER = 587;
let transporter: Transporter | null = null;

const createTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }

  // Validate email configuration
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'Email configuration is missing: EMAIL_USER and EMAIL_PASS must be set',
    );
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || DEFAULT_PORT_NUMBER,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

export const sendEmail = async (options: TEmailOptions) => {
  const emailTransporter = createTransporter();

  try {
    const info = await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'test_mail',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    return info;
  } catch (error) {
    console.error('Email sending failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to: options.to,
      subject: options.subject,
      emailConfig: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASS,
      },
    });
    throw error;
  }
};

export const sendInvestorInvitationEmail = async (
  data: TInvitationEmailData,
): Promise<void> => {
  const { inviteeEmail, projectName, inviterName, invitationLink, message } =
    data;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const fullInvitationLink = `${frontendUrl}${invitationLink}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Invitation</title>
  </head>
  <body style="font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #f0f0f0; margin: 0; padding: 0; background-color: #1a1d2e;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <!-- Main card -->
      <div style="background: linear-gradient(135deg, rgba(40, 45, 65, 0.9) 0%, rgba(30, 34, 52, 0.95) 100%); padding: 40px 30px; border-radius: 12px; border: 1px solid rgba(242, 180, 55, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">
        
        <!-- Header with accent -->
        <div style="border-left: 4px solid #F2B437; padding-left: 20px; margin-bottom: 30px;">
          <h2 style="color: #F2B437; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">You've been invited to collaborate!</h2>
        </div>
        
        <!-- Main content -->
        ${inviterName ? `<p style="margin: 0 0 16px 0; color: #e0e0e0; font-size: 16px;">Hi there,</p><p style="margin: 0 0 24px 0; color: #e0e0e0; font-size: 16px;"><strong style="color: #F2B437;">${inviterName}</strong> has invited you to collaborate on the project <strong style="color: #0FA3B1;">"${projectName}"</strong> as an investor.</p>` : `<p style="margin: 0 0 16px 0; color: #e0e0e0; font-size: 16px;">Hi there,</p><p style="margin: 0 0 24px 0; color: #e0e0e0; font-size: 16px;">You've been invited to collaborate on the project <strong style="color: #0FA3B1;">"${projectName}"</strong> as an investor.</p>`}
        
        <!-- Message box if present -->
        ${message ? `<div style="background: linear-gradient(135deg, rgba(15, 163, 177, 0.15) 0%, rgba(15, 163, 177, 0.08) 100%); padding: 20px; border-left: 4px solid #0FA3B1; margin: 24px 0; border-radius: 6px;"><p style="margin: 0; font-style: italic; color: #d0d0d0; font-size: 15px;">"${message}"</p></div>` : ''}
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 36px 0;">
          <a href="${fullInvitationLink}" style="background: linear-gradient(135deg, #F2B437 0%, #e0a020 100%); color: #1a1d2e; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(242, 180, 55, 0.3); transition: all 0.3s ease;">Accept Invitation</a>
        </div>
        
        <!-- Divider -->
        <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(242, 180, 55, 0.3) 50%, transparent 100%); margin: 32px 0;"></div>
        
        <!-- Footer info -->
        <p style="font-size: 13px; color: #8a8a8a; margin: 0 0 16px 0; line-height: 1.5;">
          This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
        
        <p style="font-size: 12px; color: #707070; margin: 0; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${fullInvitationLink}" style="color: #0FA3B1; word-break: break-all; text-decoration: none;">${fullInvitationLink}</a>
        </p>
      </div>
      
      <!-- Subtle branding footer -->
      <div style="text-align: center; padding-top: 24px;">
        <p style="font-size: 12px; color: #606060; margin: 0;">Powered by Hex Dashboard</p>
      </div>
    </div>
  </body>
</html>

  `;

  await sendEmail({
    to: inviteeEmail,
    subject: `Invitation to collaborate on "${projectName}"`,
    html: emailHtml,
  });
};

export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Verify email transporter configuration
 * Call this to test if email settings are correct
 */
export const verifyEmailConfiguration = async (): Promise<boolean> => {
  try {
    const emailTransporter = createTransporter();
    await emailTransporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      emailConfig: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        user: process.env.EMAIL_USER,
        hasPassword: !!process.env.EMAIL_PASS,
      },
    });
    return false;
  }
};
