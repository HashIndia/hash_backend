import nodemailer from 'nodemailer';
import AppError from '../utils/appError.js';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection configuration on startup
    this.verifyConnection();
  }

  // Get reliable image URLs for email templates
  getEmailImageUrls() {
    // Use Cloudinary URLs for better email delivery and reliability
    return {
      hashLogo: 'https://res.cloudinary.com/dyiqxmzim/image/upload/v1756843781/hash-logo_zeabgj.jpg',
      hashLogoText: 'https://res.cloudinary.com/dyiqxmzim/image/upload/v1756843794/hash-logo-text_zxzvhz.jpg'
    };
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email Service: Connection verified successfully.');
    } catch (error) {
      console.error('❌ Email Service: Connection verification failed. Please check your SMTP credentials and settings in .env', error);
    }
  }

  // Send email
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: `Hash Clothing <${process.env.SENDER_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      console.log('📧 [Email Service] Preparing to send email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ [Email Service] Email sent successfully. Nodemailer response:', result);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ [Email Service] Email sending failed inside sendEmail function:', error);
      // We will log the error but not throw an AppError, allowing the calling function to decide how to proceed.
      // This makes the service more resilient for non-critical emails.
      return { success: false, error: error };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const imageUrls = this.getEmailImageUrls();
    const subject = 'Welcome to Hash Store!';
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #000000; padding: 40px 20px; text-align: center; border-bottom: 4px solid #f8f9fa;">
          <div style="display: inline-block; position: relative; margin-bottom: 15px;">
            <!-- Hash Logo Images Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <img src="${imageUrls.hashLogo}" alt="Hash Logo" style="height: 50px; width: auto; object-fit: contain; display: block;" />
              <img src="${imageUrls.hashLogoText}" alt="Hash Text" style="height: 50px; width: auto; object-fit: contain; display: block;" />
            </div>
          </div>
          <p style="color: #f8f9fa; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Premium E-commerce</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 400;">Welcome to Hash Store!</h2>
          </div>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #000000; margin-bottom: 20px; font-weight: 400; font-size: 24px;">Hello ${user.name}!</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Thank you for joining Hash Store! We're excited to have you as part of our community.
          </p>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Get ready to explore our amazing collection of fashion items and enjoy exclusive deals.
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}/shop" 
               style="background: #000000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; font-size: 14px;">
              Start Shopping
            </a>
          </div>
          <p style="color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
            If you have any questions, feel free to contact our support team.
          </p>
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © Hash - Premium E-commerce Platform
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  // Send OTP email
  async sendOTPEmail(user, otp) {
    const imageUrls = this.getEmailImageUrls();
    const subject = 'Your Hash Store Verification Code';
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #000000; padding: 40px 20px; text-align: center; border-bottom: 4px solid #f8f9fa;">
          <div style="display: inline-block; position: relative; margin-bottom: 15px;">
            <!-- Hash Logo Images Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <img src="${imageUrls.hashLogo}" alt="Hash Logo" style="height: 50px; width: auto; object-fit: contain; display: block;" />
              <img src="${imageUrls.hashLogoText}" alt="Hash Text" style="height: 50px; width: auto; object-fit: contain; display: block;" />
            </div>
          </div>
          <p style="color: #f8f9fa; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Premium E-commerce</p>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #000000; margin-bottom: 20px; font-weight: 400; font-size: 24px;">Hello ${user.name}</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Your verification code is:
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <div style="background: #f8f9fa; border: 2px solid #000000; color: #000000; padding: 25px 30px; font-size: 36px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          <p style="color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
            This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
          </p>
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © Hash - Premium E-commerce Platform
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(order) {
    const imageUrls = this.getEmailImageUrls();
    const subject = `Order Confirmation - ${order.orderNumber}`;
    
    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.size ? `Size: ${item.size}` : ''} ${item.color ? `Color: ${item.color}` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #000000; padding: 40px 20px; text-align: center; border-bottom: 4px solid #f8f9fa;">
          <div style="display: inline-block; position: relative; margin-bottom: 15px;">
            <!-- Hash Logo Images Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <img src="${imageUrls.hashLogo}" alt="Hash Logo" style="height: 50px; width: auto; object-fit: contain; display: block;" />
              <img src="${imageUrls.hashLogoText}" alt="Hash Text" style="height: 50px; width: auto; object-fit: contain; display: block;" />
            </div>
          </div>
          <p style="color: #f8f9fa; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Premium E-commerce</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 400;">Order Confirmed!</h2>
            <p style="color: #f8f9fa; margin: 10px 0 0 0; font-size: 16px;">Order #${order.orderNumber}</p>
          </div>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #000000; margin-bottom: 20px; font-weight: 400; font-size: 24px;">Hello ${order.customerInfo.name}</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for your order! We've received your order and will process it soon.
          </p>
          
          <h3 style="color: #000000; margin: 40px 0 20px 0; font-size: 20px; font-weight: 500;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e9ecef;">
            <thead>
              <tr style="background: #f8f9fa; border-bottom: 2px solid #000000;">
                <th style="padding: 15px 10px; text-align: left; color: #000000; font-weight: 600;">Image</th>
                <th style="padding: 15px 10px; text-align: left; color: #000000; font-weight: 600;">Product</th>
                <th style="padding: 15px 10px; text-align: center; color: #000000; font-weight: 600;">Details</th>
                <th style="padding: 15px 10px; text-align: center; color: #000000; font-weight: 600;">Qty</th>
                <th style="padding: 15px 10px; text-align: right; color: #000000; font-weight: 600;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="background: #f8f9fa; padding: 25px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 30px;">
            <h4 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Order Summary</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
              <span>Subtotal:</span>
              <span>₹${order.subtotal}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
              <span>Shipping:</span>
              <span>₹${order.shipping}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
              <span>Tax:</span>
              <span>₹${order.tax}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 20px; border-top: 2px solid #000000; padding-top: 15px; margin-top: 15px; color: #000000;">
              <span>Total:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}/orders/${order._id}" 
               style="background: #000000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; font-size: 14px;">
              Track Your Order
            </a>
          </div>
          
          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © Hash - Premium E-commerce Platform
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: order.customerInfo.email,
      subject,
      html
    });
  }

  // Send shipping notification
  async sendShippingNotification(order) {
    const subject = `Your order has been shipped - ${order.orderNumber}`;
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #000000; padding: 40px 20px; text-align: center; border-bottom: 4px solid #f8f9fa;">
          <div style="display: inline-block; position: relative; margin-bottom: 15px;">
            <!-- Hash Logo Images Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <img src="${process.env.FRONTEND_URL}/hash-logo.jpg" alt="Hash Logo" style="height: 50px; width: auto; object-fit: contain;" />
              <img src="${process.env.FRONTEND_URL}/hash-logo-text.jpg" alt="Hash Text" style="height: 50px; width: auto; object-fit: contain;" />
            </div>
          </div>
          <p style="color: #f8f9fa; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Premium E-commerce</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 400;">Order Shipped!</h2>
            <p style="color: #f8f9fa; margin: 10px 0 0 0; font-size: 16px;">Order #${order.orderNumber}</p>
          </div>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #000000; margin-bottom: 20px; font-weight: 400; font-size: 24px;">Hello ${order.customerInfo.name}</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Great news! Your order has been shipped and is on its way to you.
          </p>
          
          ${order.trackingNumber ? `
            <div style="background: #f8f9fa; padding: 25px; border: 1px solid #e9ecef; border-radius: 8px; margin: 30px 0;">
              <h4 style="margin: 0 0 15px 0; color: #000000; font-size: 18px; font-weight: 600;">Tracking Information</h4>
              <p style="margin: 0; color: #333333; font-size: 16px;">Tracking Number: <strong style="font-family: 'Courier New', monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${order.trackingNumber}</strong></p>
              ${order.carrier ? `<p style="margin: 10px 0 0 0; color: #333333; font-size: 16px;">Carrier: <strong>${order.carrier}</strong></p>` : ''}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.FRONTEND_URL}/orders/${order._id}" 
               style="background: #000000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; font-size: 14px;">
              Track Your Package
            </a>
          </div>
          
          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © Hash - Premium E-commerce Platform
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: order.customerInfo.email,
      subject,
      html
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const imageUrls = this.getEmailImageUrls();
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #000000; padding: 40px 20px; text-align: center; border-bottom: 4px solid #f8f9fa;">
          <div style="display: inline-block; position: relative; margin-bottom: 15px;">
            <!-- Hash Logo Images Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <img src="${imageUrls.hashLogo}" alt="Hash Logo" style="height: 50px; width: auto; object-fit: contain; display: block;" />
              <img src="${imageUrls.hashLogoText}" alt="Hash Text" style="height: 50px; width: auto; object-fit: contain; display: block;" />
            </div>
          </div>
          <p style="color: #f8f9fa; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Premium E-commerce</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 400;">Password Reset</h2>
          </div>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #000000; margin-bottom: 20px; font-weight: 400; font-size: 24px;">Hello ${user.name}</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            We received a request to reset your password. Click the button below to reset it:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetURL}" 
               style="background: #000000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; font-size: 14px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
            This link will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
          </p>
          
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © Hash - Premium E-commerce Platform
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }

  // Send delivery notification with OTP
  async sendDeliveryOTP(order, otp) {
    const subject = `Delivery OTP - ${order.orderNumber}`;
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: #000000; padding: 40px 20px; text-align: center; border-bottom: 4px solid #f8f9fa;">
          <div style="display: inline-block; position: relative; margin-bottom: 15px;">
            <!-- Hash Logo Images Side by Side -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
              <img src="${process.env.FRONTEND_URL}/hash-logo.jpg" alt="Hash Logo" style="height: 50px; width: auto; object-fit: contain;" />
              <img src="${process.env.FRONTEND_URL}/hash-logo-text.jpg" alt="Hash Text" style="height: 50px; width: auto; object-fit: contain;" />
            </div>
          </div>
          <p style="color: #f8f9fa; margin: 8px 0 0 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Premium E-commerce</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 400;">Out for Delivery</h2>
            <p style="color: #f8f9fa; margin: 10px 0 0 0; font-size: 16px;">Order #${order.orderNumber}</p>
          </div>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #000000; margin-bottom: 20px; font-weight: 400; font-size: 24px;">Hello ${order.customerInfo.name}</h2>
          <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Your order is out for delivery! Please share this OTP with the delivery partner:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="background: #f8f9fa; border: 2px solid #000000; color: #000000; padding: 25px 30px; font-size: 36px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
            This OTP is valid for 24 hours and is required for delivery confirmation.
          </p>
          
          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © Hash - Premium E-commerce Platform
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: order.customerInfo.email,
      subject,
      html
    });
  }

  // Send marketing email
  async sendMarketing(to, subject, content, name = '') {
    const personalizedContent = content.replace(/{{name}}/g, name);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 30px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
          <div>${personalizedContent}</div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html
    });
  }
}

export default new EmailService();