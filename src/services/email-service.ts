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

  await emailTransporter.sendMail({
    from: process.env.EMAIL_FROM || 'test_mail',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
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
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50;">You've been invited to collaborate!</h2>
          
          ${inviterName ? `<p>Hi there,</p><p><strong>${inviterName}</strong> has invited you to collaborate on the project <strong>"${projectName}"</strong> as an investor.</p>` : `<p>Hi there,</p><p>You've been invited to collaborate on the project <strong>"${projectName}"</strong> as an investor.</p>`}
          
          ${message ? `<div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;"><p style="margin: 0; font-style: italic;">"${message}"</p></div>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${fullInvitationLink}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Accept Invitation</a>
          </div>
          
          <p style="font-size: 12px; color: #7f8c8d; margin-top: 30px;">
            This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          
          <p style="font-size: 12px; color: #7f8c8d;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${fullInvitationLink}" style="color: #3498db; word-break: break-all;">${fullInvitationLink}</a>
          </p>
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
