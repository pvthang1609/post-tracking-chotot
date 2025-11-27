import * as nodemailer from 'nodemailer';
import { Config, Listing } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  async sendNewListingsNotification(listings: Listing[]): Promise<void> {
    if (listings.length === 0) {
      return;
    }

    const subject = `🔔 ${listings.length} tin rao mới trên Chợ Tốt`;
    const html = this.generateEmailHtml(listings);

    try {
      await this.transporter.sendMail({
        from: this.config.email.user,
        to: this.config.email.notifyEmail,
        subject,
        html,
      });

      console.log(`✓ Đã gửi email thông báo ${listings.length} tin rao mới`);
    } catch (error) {
      console.error('Lỗi khi gửi email:', error);
      // Không throw để app tiếp tục chạy
    }
  }

  private generateEmailHtml(listings: Listing[]): string {
    const listingCards = listings
      .map(listing => {
        const priceFormatted = this.formatPrice(listing.price);
        const imageHtml = listing.imageUrl
          ? `<img src="${listing.imageUrl}" alt="${listing.title}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; margin-bottom: 10px;">`
          : '';

        return `
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #fff;">
            ${imageHtml}
            <h3 style="margin: 0 0 10px 0; color: #333;">
              <a href="${listing.url}" style="color: #d0021b; text-decoration: none;">${listing.title}</a>
            </h3>
            <p style="font-size: 20px; font-weight: bold; color: #d0021b; margin: 10px 0;">
              ${priceFormatted}
            </p>
            ${listing.location ? `<p style="color: #666; margin: 5px 0;">📍 ${listing.location}</p>` : ''}
            <p style="margin: 10px 0;">
              <a href="${listing.url}" style="display: inline-block; background-color: #d0021b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Xem chi tiết
              </a>
            </p>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #d0021b; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0;">Chợ Tốt Tracker</h1>
            <p style="margin: 10px 0 0 0;">Có ${listings.length} tin rao mới phù hợp với tiêu chí của bạn</p>
          </div>
          <div style="background-color: #fff; padding: 20px; border-radius: 0 0 8px 8px;">
            ${listingCards}
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Email này được gửi tự động từ Chợ Tốt Tracker</p>
            <p>Khoảng giá: ${this.formatPrice(this.config.minPrice)} - ${this.formatPrice(this.config.maxPrice)}</p>
          </div>
        </body>
      </html>
    `;
  }

  private formatPrice(price: number): string {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)} tỷ`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)} triệu`;
    } else {
      return price.toLocaleString('vi-VN') + ' đ';
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✓ Kết nối email thành công');
      return true;
    } catch (error) {
      console.error('✗ Lỗi kết nối email:', error);
      return false;
    }
  }
}
