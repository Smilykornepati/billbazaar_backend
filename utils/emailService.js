const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // In development mode, log to console instead of sending email
  if (process.env.DEVELOPMENT_MODE === 'true') {
    return null;
  }

  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, name, otp, isPasswordReset = false) => {
  try {
    // In development mode, just log the OTP
    if (process.env.DEVELOPMENT_MODE === 'true') {
      console.log('='.repeat(50));
      console.log('📧 EMAIL SERVICE - DEVELOPMENT MODE');
      console.log('='.repeat(50));
      console.log(`To: ${email}`);
      console.log(`Name: ${name}`);
      console.log(`OTP: ${otp}`);
      console.log(`Type: ${isPasswordReset ? 'Password Reset' : 'Email Verification'}`);
      console.log('='.repeat(50));
      return;
    }

    const transporter = createTransporter();
    
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    const subject = isPasswordReset ? 
      'Password Reset OTP - Your App' : 
      'Email Verification OTP - Your App';

    const htmlContent = isPasswordReset ? 
      getPasswordResetEmailTemplate(name, otp) : 
      getVerificationEmailTemplate(name, otp);

    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      text: `Hi ${name}, Your ${isPasswordReset ? 'password reset' : 'verification'} OTP is: ${otp}. This OTP will expire in 10 minutes.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Email template for verification
const getVerificationEmailTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .otp { background: #007bff; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Email Verification</h1>
            </div>
            <div class="content">
                <h2>Hello ${name}!</h2>
                <p>Thank you for registering with our application. To complete your registration, please verify your email address using the OTP below:</p>
                
                <div class="otp">${otp}</div>
                
                <div class="warning">
                    <strong>⚠️ Important:</strong>
                    <ul>
                        <li>This OTP will expire in <strong>10 minutes</strong></li>
                        <li>Do not share this OTP with anyone</li>
                        <li>If you didn't request this verification, please ignore this email</li>
                    </ul>
                </div>
                
                <p>If you're having trouble with the verification process, please contact our support team.</p>
                
                <p>Best regards,<br>Your App Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Email template for password reset
const getPasswordResetEmailTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .otp { background: #dc3545; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset</h1>
            </div>
            <div class="content">
                <h2>Hello ${name}!</h2>
                <p>We received a request to reset your password. Use the OTP below to proceed with password reset:</p>
                
                <div class="otp">${otp}</div>
                
                <div class="warning">
                    <strong>🔒 Security Notice:</strong>
                    <ul>
                        <li>This OTP will expire in <strong>10 minutes</strong></li>
                        <li>Never share this OTP with anyone</li>
                        <li>If you didn't request a password reset, please ignore this email and consider changing your password</li>
                    </ul>
                </div>
                
                <p>If you're having trouble with the password reset process, please contact our support team immediately.</p>
                
                <p>Best regards,<br>Your App Team</p>
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Test email configuration
const testEmailConfig = async () => {
  if (process.env.DEVELOPMENT_MODE === 'true') {
    console.log('Email service is in development mode - emails will be logged to console');
    return true;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Transporter not created');
    }
    
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  testEmailConfig
};