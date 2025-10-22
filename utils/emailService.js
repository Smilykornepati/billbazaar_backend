const nodemailer = require('nodemailer');

const createTransporter = () => {
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

const sendOTPEmail = async (email, name, otp, isPasswordReset = false) => {
  try {
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

const getVerificationEmailTemplate = (name, otp) => {
  return `
    
    
    
        
        
        Email Verification
        
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .otp { background: #007bff; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        
    
    
        
            
                Email Verification
            
            
                Hello ${name}!
                Thank you for registering with our application. To complete your registration, please verify your email address using the OTP below:
                
                ${otp}
                
                
                    ⚠️ Important:
                    
                        This OTP will expire in 10 minutes
                        Do not share this OTP with anyone
                        If you didn't request this verification, please ignore this email
                    
                
                
                If you're having trouble with the verification process, please contact our support team.
                
                Best regards,Your App Team
            
            
                This is an automated email. Please do not reply to this email.
            
        
    
    
  `;
};

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