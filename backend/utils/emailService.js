const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// ─── Transporter ────────────────────────────────────────────────────
// When EMAIL_HOST is configured, use real SMTP. Otherwise fall back to
// a file-based dev sink so no emails are lost during development.
let transporter;

if (process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
} else {
    // Dev sink — write each "email" to /tmp/eventx-emails.log
    const DEV_LOG = path.join(require('os').tmpdir(), 'eventx-emails.log');
    transporter = {
        sendMail: async (opts) => {
            const entry = `\n${'─'.repeat(60)}\n[${new Date().toISOString()}]\nTO: ${opts.to}\nSUBJECT: ${opts.subject}\n${opts.text || ''}\n`;
            await fs.promises.appendFile(DEV_LOG, entry, 'utf8');
            logger.info(`[DEV EMAIL] Written to ${DEV_LOG} — To: ${opts.to} | Subject: ${opts.subject}`);
            return { messageId: 'dev-' + Date.now() };
        },
    };
    logger.warn('No EMAIL_HOST configured — emails will be written to: ' + path.join(require('os').tmpdir(), 'eventx-emails.log'));
}

// ─── Helpers ────────────────────────────────────────────────────────
const FROM = process.env.EMAIL_FROM || '"EventX Studio" <no-reply@eventx.studio>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Email Templates ─────────────────────────────────────────────────
const sendVerificationEmail = async (to, token) => {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: 'Verify your EventX Studio email',
            text: `Welcome to EventX Studio!\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, you can safely ignore this email.`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#2563eb">Welcome to EventX Studio!</h2>
        <p>Please verify your email address by clicking the button below.</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
        <p style="margin-top:16px;color:#6b7280;font-size:14px">Or copy this link: ${verifyUrl}</p>
        <p style="color:#6b7280;font-size:12px">This link expires in 24 hours.</p>
      </div>`,
        });
        logger.info(`Verification email sent to ${to}`);
        return true;
    } catch (err) {
        logger.error(`Failed to send verification email to ${to}: ${err.message}`);
        return false;
    }
};

const sendPasswordResetEmail = async (to, token) => {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: 'Reset your EventX Studio password',
            text: `You requested a password reset.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#2563eb">Reset Your Password</h2>
        <p>Click the button below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="margin-top:16px;color:#6b7280;font-size:14px">Or copy this link: ${resetUrl}</p>
        <p style="color:#6b7280;font-size:12px">If you did not request this, ignore this email. Your password will not change.</p>
      </div>`,
        });
        logger.info(`Password reset email sent to ${to}`);
        return true;
    } catch (err) {
        logger.error(`Failed to send password reset email to ${to}: ${err.message}`);
        return false;
    }
};

const sendTicketConfirmationEmail = async (to, { eventTitle, ticketId, seatNumber, date, venueName }) => {
    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: `Your ticket for ${eventTitle} — EventX Studio`,
            text: `Your ticket booking is confirmed!\n\nEvent: ${eventTitle}\nDate: ${date}\nVenue: ${venueName}\nSeat: ${seatNumber}\nTicket ID: ${ticketId}\n\nSee you there!`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#059669">Booking Confirmed! 🎉</h2>
        <p>Your ticket for <strong>${eventTitle}</strong> is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">Event</td><td style="padding:8px;border:1px solid #e5e7eb">${eventTitle}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">Date</td><td style="padding:8px;border:1px solid #e5e7eb">${date}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">Venue</td><td style="padding:8px;border:1px solid #e5e7eb">${venueName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">Seat</td><td style="padding:8px;border:1px solid #e5e7eb">${seatNumber}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600">Ticket ID</td><td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace">${ticketId}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px">Please bring this email or your ticket QR code to the venue.</p>
      </div>`,
        });
        logger.info(`Ticket confirmation email sent to ${to} for event ${eventTitle}`);
        return true;
    } catch (err) {
        logger.error(`Failed to send ticket confirmation to ${to}: ${err.message}`);
        return false;
    }
};

const sendWaitlistNotificationEmail = async (to, { eventTitle, bookingUrl }) => {
    try {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: `A spot just opened for ${eventTitle} — EventX Studio`,
            text: `Great news! A seat has become available for ${eventTitle}.\n\nBook now before it's gone: ${bookingUrl}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#2563eb">A spot just opened up!</h2>
        <p>A seat for <strong>${eventTitle}</strong> has become available.</p>
        <a href="${bookingUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Book Now</a>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">This offer is on a first-come, first-served basis.</p>
      </div>`,
        });
        return true;
    } catch (err) {
        logger.error(`Failed to send waitlist notification to ${to}: ${err.message}`);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendTicketConfirmationEmail,
    sendWaitlistNotificationEmail,
};
