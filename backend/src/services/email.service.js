const nodemailer = require('nodemailer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

let transporter = null;
const jsonTransportOutbox = [];
let forceFailureForTests = false;

function setForceEmailFailureForTests(value) {
  forceFailureForTests = Boolean(value);
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (env.email.transport === 'json') {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return transporter;
  }

  if (!env.email.smtp.host) {
    throw new AppError(
      'Email delivery is not configured. Set SMTP_HOST or EMAIL_TRANSPORT=json for development/tests.',
      503,
      { code: 'EMAIL_NOT_CONFIGURED' }
    );
  }

  transporter = nodemailer.createTransport({
    host: env.email.smtp.host,
    port: env.email.smtp.port,
    secure: env.email.smtp.secure,
    auth:
      env.email.smtp.user && env.email.smtp.pass
        ? {
            user: env.email.smtp.user,
            pass: env.email.smtp.pass,
          }
        : undefined,
  });

  return transporter;
}

function resetEmailTransportForTests() {
  transporter = null;
  jsonTransportOutbox.length = 0;
  forceFailureForTests = false;
}

function getJsonTransportOutbox() {
  return jsonTransportOutbox;
}

async function sendEmail({ to, subject, text, html }) {
  try {
    if (forceFailureForTests) {
      const failure = new Error('Forced email failure for tests');
      failure.code = 'EENVELOPE';
      throw failure;
    }

    const transport = getTransporter();
    const info = await transport.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html,
    });

    if (env.email.transport === 'json') {
      let parsed = null;
      try {
        parsed = JSON.parse(info.message);
      } catch (_error) {
        parsed = { raw: info.message };
      }
      jsonTransportOutbox.push({
        to,
        subject,
        text,
        html,
        message: parsed,
        at: new Date().toISOString(),
      });
    }

    return {
      messageId: info.messageId || null,
      accepted: true,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('Email delivery failed:', {
      code: error.code || null,
      name: error.name || null,
    });

    throw new AppError('Failed to send email.', 503, {
      code: 'EMAIL_DELIVERY_FAILED',
    });
  }
}

async function sendNewsletterConfirmationEmail({ to, confirmUrl }) {
  const subject = 'Confirm your newsletter subscription';
  const text = [
    'Thank you for subscribing to our school newsletter.',
    '',
    'Please confirm your subscription by opening this link:',
    confirmUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Thank you for subscribing to our school newsletter.</p>
    <p><a href="${confirmUrl}">Confirm your subscription</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  return sendEmail({ to, subject, text, html });
}

async function sendNewsletterWelcomeEmail({ to, unsubscribeUrl }) {
  const subject = 'Subscription confirmed';
  const text = [
    'Your newsletter subscription is confirmed.',
    '',
    'To unsubscribe at any time, use this link:',
    unsubscribeUrl,
  ].join('\n');

  const html = `
    <p>Your newsletter subscription is confirmed.</p>
    <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendNewsletterConfirmationEmail,
  sendNewsletterWelcomeEmail,
  resetEmailTransportForTests,
  getJsonTransportOutbox,
  setForceEmailFailureForTests,
};
