import { loadConfig } from './utils/config';
import { Storage } from './utils/storage';
import { ChototScraper } from './services/scraper';
import { TelegramService } from './services/telegramService';

class ChototTracker {
  private config = loadConfig();
  private storage = new Storage();
  private scraper = new ChototScraper(this.config);
  private telegramService = new TelegramService(this.config);
  private isRunning = false;

  async start(): Promise<void> {
    console.log('=== Chợ Tốt Tracker ===');
    console.log(`Danh mục: ${this.config.categoryUrl}`);
    console.log(`Kiểm tra mỗi: ${this.config.checkInterval / 1000}s`);
    console.log('\nTracking Groups:');
    for (const group of this.config.trackingGroups) {
      console.log(`  - ${group.name}: ${group.keywords.join(', ')} (${this.formatPrice(group.minPrice)} - ${this.formatPrice(group.maxPrice)})`);
      console.log(`    -> Gửi đến: ${group.telegramBots.join(', ')}`);
    }
    console.log('\nTelegram Bots:');
    for (const bot of this.config.telegramBots) {
      console.log(`  - ${bot.name}`);
    }
    console.log('======================\n');

    // Test Telegram connections
    await this.telegramService.testAllConnections();

    // Initialize browser
    await this.scraper.init();

    // Initial snapshot
    console.log('Đang tạo snapshot ban đầu...');
    const initialListings = await this.scraper.scrapeAllListings();
    if (initialListings !== null) {
      this.storage.saveSnapshot(initialListings);
    } else {
      console.error('[ERROR] Không thể tạo snapshot ban đầu. Vui lòng kiểm tra kết nối mạng hoặc URL.');
      await this.scraper.close();
      process.exit(1);
    }

    // Start monitoring
    this.isRunning = true;
    this.scheduleCheck();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nĐang dừng tracker...');
      this.isRunning = false;
      await this.scraper.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\nĐang dừng tracker...');
      this.isRunning = false;
      await this.scraper.close();
      process.exit(0);
    });
  }

  private scheduleCheck(): void {
    if (!this.isRunning) return;

    setTimeout(async () => {
      await this.checkForNewListings();
      this.scheduleCheck();
    }, this.config.checkInterval);

    const nextCheck = new Date(Date.now() + this.config.checkInterval);
    console.log(`Kiểm tra tiếp theo lúc: ${nextCheck.toLocaleString('vi-VN')}\n`);
  }

  private async checkForNewListings(): Promise<void> {
    try {
      console.log(`[${new Date().toLocaleString('vi-VN')}] Đang kiểm tra tin rao mới...`);

      const currentListings = await this.scraper.scrapeAllListings();

      if (currentListings === null) {
        console.log('[WARN] Scrape thất bại, giữ nguyên snapshot hiện tại');
        return;
      }

      const previousListings = this.storage.loadSnapshot();
      const allNewListings = this.storage.findNewListings(currentListings, previousListings);

      if (allNewListings.length > 0) {
        console.log(`Tìm thấy ${allNewListings.length} tin rao mới tổng cộng:`);

        // Log tất cả tin mới để debug
        allNewListings.forEach((listing, index) => {
          console.log(`  [${index + 1}] ${listing.title} - ${this.formatPrice(listing.price)}`);
        });

        // Xử lý từng tracking group
        let matchedAny = false;
        for (const group of this.config.trackingGroups) {
          const groupListings = this.scraper.filterListingsForGroup(allNewListings, group);

          if (groupListings.length > 0) {
            matchedAny = true;
            console.log(`\nGroup "${group.name}": ${groupListings.length} tin khớp`);

            // Gửi thông báo Telegram cho group này
            await this.telegramService.sendNotificationToGroup(groupListings, group);

            // Log listings
            groupListings.forEach((listing, index) => {
              console.log(`  [${index + 1}] ${listing.title}`);
              console.log(`      Giá: ${this.formatPrice(listing.price)}`);
              console.log(`      URL: ${listing.url}`);
            });
          } else {
            console.log(`\nGroup "${group.name}": 0 tin khớp (keywords: ${group.keywords.join(', ')}, giá: ${this.formatPrice(group.minPrice)}-${this.formatPrice(group.maxPrice)})`);
          }
        }

        if (!matchedAny) {
          console.log('\nKhông có tin nào khớp với các tracking group');
        }
      } else {
        console.log('Không có tin rao mới.');
      }

      this.storage.saveSnapshot(currentListings);
    } catch (error) {
      console.error('Lỗi khi kiểm tra tin rao:', error);
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

// Start the tracker
const tracker = new ChototTracker();
tracker.start().catch(error => {
  console.error('Lỗi khởi động:', error);
  process.exit(1);
});
