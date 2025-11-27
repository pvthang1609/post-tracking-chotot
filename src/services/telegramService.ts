import { Config, Listing, TelegramBot, TrackingGroup } from '../types';

export class TelegramService {
  private config: Config;
  private botMap: Map<string, TelegramBot>;

  constructor(config: Config) {
    this.config = config;
    this.botMap = new Map(config.telegramBots.map(bot => [bot.name, bot]));
  }

  async sendNotificationToGroup(
    listings: Listing[],
    group: TrackingGroup
  ): Promise<void> {
    if (listings.length === 0) {
      return;
    }

    const message = this.formatMessage(listings, group);

    // Gửi đến tất cả các bot trong group
    for (const botName of group.telegramBots) {
      const bot = this.botMap.get(botName);
      if (bot) {
        try {
          await this.sendMessage(bot, message);
          console.log(`[OK] Đã gửi Telegram [${bot.name}] - ${listings.length} tin cho group "${group.name}"`);
        } catch (error) {
          console.error(`Lỗi khi gửi Telegram [${bot.name}]:`, error);
        }
      }
    }
  }

  private formatMessage(listings: Listing[], group: TrackingGroup): string {
    const header = `*${listings.length} tin rao mới*\n`;
    const groupInfo = `Group: ${this.escapeMarkdown(group.name)}\n`;
    const minPrice = this.escapeMarkdown(this.formatPrice(group.minPrice));
    const maxPrice = this.escapeMarkdown(this.formatPrice(group.maxPrice));
    const priceRange = `Giá: ${minPrice} \\- ${maxPrice}\n`;
    const keywordsInfo = `Keywords: ${this.escapeMarkdown(group.keywords.join(', '))}\n\n`;

    const listingTexts = listings.map((listing, index) => {
      let text = `*${index + 1}\\. ${this.escapeMarkdown(listing.title)}*\n`;
      text += `Giá: ${this.escapeMarkdown(this.formatPrice(listing.price))}\n`;
      if (listing.location) {
        text += `${this.escapeMarkdown(listing.location)}\n`;
      }
      text += `[Xem chi tiết](${this.escapeUrl(listing.url)})`;
      return text;
    }).join('\n\n');

    return header + groupInfo + priceRange + keywordsInfo + listingTexts;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[-_*[\]()~`>#+|={}\.!]/g, '\\$&');
  }

  private escapeUrl(url: string): string {
    return url.replace(/[()]/g, '\\$&');
  }

  private async sendMessage(bot: TelegramBot, text: string): Promise<void> {
    const apiUrl = `https://api.telegram.org/bot${bot.botToken}/sendMessage`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: bot.chatId,
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

  async testAllConnections(): Promise<void> {
    for (const bot of this.config.telegramBots) {
      try {
        const apiUrl = `https://api.telegram.org/bot${bot.botToken}/getMe`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          console.log(`[OK] Telegram [${bot.name}] - @${data.result.username}`);
        } else {
          console.error(`[ERROR] Telegram [${bot.name}] - kết nối thất bại`);
        }
      } catch (error) {
        console.error(`[ERROR] Telegram [${bot.name}]:`, error);
      }
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
