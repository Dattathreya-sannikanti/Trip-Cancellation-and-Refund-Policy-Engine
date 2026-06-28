import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Add CORS headers to allow cross-origin requests from Render
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, html, smtpUser, smtpPass, smtpServer, smtpPort } = req.body;

    if (!to || !subject || !html || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'Missing required fields in relay payload' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpServer || 'smtp.gmail.com',
      port: smtpPort || 465,
      secure: smtpPort === 465 || smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Manivtha Tours" <${smtpUser}>`,
      to,
      subject,
      html,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Relay error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
