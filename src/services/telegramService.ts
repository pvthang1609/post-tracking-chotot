import { Config, Listing } from '../types';

export class TelegramService {
  private config: Config;
  private apiUrl: string;

  constructor(config: Config) {
    this.config = config;
    this.apiUrl = `https://api.telegram.org/bot${config.telegram.botToken}`;
  }

  async sendNewListingsNotification(listings: Listing[]): Promise<void> {
    if (listings.length === 0 || !this.config.telegram.enabled) {
      return;
    }

    try {
      const message = this.formatMessage(listings);
      await this.sendMessage(message);
      console.log(`✓ Đã gửi Telegram thông báo ${listings.length} tin rao mới`);
    } catch (error) {
      console.error('Lỗi khi gửi Telegram:', error);
    }
  }

  private formatMessage(listings: Listing[]): string {
    const header = `🔔 *${listings.length} tin rao mới trên Chợ Tốt*\n`;
    const minPrice = this.escapeMarkdown(this.formatPrice(this.config.minPrice));
    const maxPrice = this.escapeMarkdown(this.formatPrice(this.config.maxPrice));
    const priceRange = `💰 Khoảng giá: ${minPrice} \\- ${maxPrice}\n\n`;

    const listingTexts = listings.map((listing, index) => {
      let text = `*${index + 1}\\. ${this.escapeMarkdown(listing.title)}*\n`;
      text += `💵 ${this.escapeMarkdown(this.formatPrice(listing.price))}\n`;
      if (listing.location) {
        text += `📍 ${this.escapeMarkdown(listing.location)}\n`;
      }
      text += `🔗 [Xem chi tiết](${this.escapeUrl(listing.url)})`;
      return text;
    }).join('\n\n');

    return header + priceRange + listingTexts;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[-_*[\]()~`>#+|={}\.!]/g, '\\$&');
  }

  private escapeUrl(url: string): string {
    return url.replace(/[()]/g, '\\$&');
  }

  private async sendMessage(text: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: this.config.telegram.chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.telegram.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/getMe`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Kết nối Telegram thành công (Bot: @${data.result.username})`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('✗ Lỗi kết nối Telegram:', error);
      return false;
    }
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
}
