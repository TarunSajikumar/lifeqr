const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"LifeQR Emergency" <noreply@lifeqr.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Email sent to ${options.to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Error sending email to ${options.to}:`, error);
      // Fallback log
      console.log(`[SMTP FAILED - EMAIL LOG]:\nTO: ${options.to}\nSUBJECT: ${options.subject}\nBODY: ${options.text || options.html}`);
    }
  } else {
    // In development mode with no SMTP server configured
    console.log(`[SMTP DEV MOCK - EMAIL LOG]:\nTO: ${options.to}\nSUBJECT: ${options.subject}\nBODY: ${options.text || options.html}`);
    return { mock: true, messageId: `mock_${Date.now()}` };
  }
};

module.exports = {
  sendEmail
};
