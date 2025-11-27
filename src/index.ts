import { loadConfig } from './utils/config';
import { Storage } from './utils/storage';
import { ChototScraper } from './services/scraper';
import { EmailService } from './services/emailService';
import { TelegramService } from './services/telegramService';

class ChototTracker {
  private config = loadConfig();
  private storage = new Storage();
  private scraper = new ChototScraper(this.config);
  private emailService = new EmailService(this.config);
  private telegramService = new TelegramService(this.config);
  private isRunning = false;

  async start(): Promise<void> {
    console.log('=== Chợ Tốt Tracker ===');
    console.log(`Danh mục: ${this.config.categoryUrl}`);
    console.log(`Khoảng giá: ${this.formatPrice(this.config.minPrice)} - ${this.formatPrice(this.config.maxPrice)}`);
    if (this.config.keywords.length > 0) {
      console.log(`Từ khóa: ${this.config.keywords.join(', ')}`);
    }
    console.log(`Kiểm tra mỗi: ${this.config.checkInterval / 1000}s`);
    console.log('======================\n');

    // Test notification connections
    if (this.config.telegram.enabled) {
      await this.telegramService.testConnection();
    }
    if (this.config.email.user) {
      const emailOk = await this.emailService.testConnection();
      if (!emailOk) {
        console.log('⚠️  Email không kết nối được');
      }
    }

    // Initialize browser
    await this.scraper.init();

    // Initial snapshot
    console.log('Đang tạo snapshot ban đầu...');
    const initialListings = await this.scraper.scrapeListings();
    if (initialListings !== null) {
      this.storage.saveSnapshot(initialListings);
    } else {
      console.error('⚠️  Không thể tạo snapshot ban đầu. Vui lòng kiểm tra kết nối mạng hoặc URL.');
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
    console.log(`⏰ Kiểm tra tiếp theo lúc: ${nextCheck.toLocaleString('vi-VN')}\n`);
  }

  private async checkForNewListings(): Promise<void> {
    try {
      console.log(`[${new Date().toLocaleString('vi-VN')}] Đang kiểm tra tin rao mới...`);

      const currentListings = await this.scraper.scrapeListings();

      // Nếu scrape thất bại (trả về null), bỏ qua lần check này
      // KHÔNG cập nhật snapshot để tránh ghi đè với dữ liệu rỗng
      if (currentListings === null) {
        console.log('⚠️  Scrape thất bại, giữ nguyên snapshot hiện tại');
        return;
      }

      const previousListings = this.storage.loadSnapshot();

      const newListings = this.storage.findNewListings(currentListings, previousListings);

      if (newListings.length > 0) {
        console.log(`🎉 Tìm thấy ${newListings.length} tin rao mới!`);

        // Send notifications
        if (this.config.telegram.enabled) {
          await this.telegramService.sendNewListingsNotification(newListings);
        }
        if (this.config.email.user) {
          await this.emailService.sendNewListingsNotification(newListings);
        }

        // Log new listings
        newListings.forEach((listing, index) => {
          console.log(`\n[${index + 1}] ${listing.title}`);
          console.log(`    Giá: ${this.formatPrice(listing.price)}`);
          console.log(`    URL: ${listing.url}`);
          if (listing.location) {
            console.log(`    Vị trí: ${listing.location}`);
          }
        });
      } else {
        console.log('Không có tin rao mới.');
      }

      // CHỈ cập nhật snapshot khi scrape thành công
      // Nếu currentListings là [], có nghĩa là thực sự không có tin rao (không phải lỗi)
      this.storage.saveSnapshot(currentListings);
    } catch (error) {
      console.error('Lỗi khi kiểm tra tin rao:', error);
      // Không lưu snapshot khi có exception
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
