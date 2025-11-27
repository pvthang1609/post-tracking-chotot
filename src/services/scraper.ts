import { chromium, Browser, Page } from 'playwright';
import { Listing, Config } from '../types';

export class ChototScraper {
  private browser: Browser | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log('✓ Đã khởi động trình duyệt');
  }

  async scrapeListings(): Promise<Listing[] | null> {
    if (!this.browser) {
      throw new Error('Browser chưa được khởi tạo. Gọi init() trước.');
    }

    const page = await this.browser.newPage();

    // Block các tracking và analytics để tăng tốc độ load
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com',
        'facebook.net',
        'doubleclick.net',
        'analytics',
        'tracking',
        'mixpanel',
        'hotjar',
      ];

      if (blockedDomains.some(domain => url.includes(domain))) {
        route.abort();
      } else {
        route.continue();
      }
    });

    try {
      console.log(`Đang truy cập: ${this.config.categoryUrl}`);

      // Thay đổi waitUntil strategy:
      // - 'domcontentloaded': Chỉ đợi DOM load (nhanh nhất, đủ để scrape)
      // - timeout: 30s để tránh treo quá lâu
      await page.goto(this.config.categoryUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Đợi cho selector chính xuất hiện thay vì đợi cố định
      await page.waitForSelector('div.cdonovt', { timeout: 10000 });

      // Lấy danh sách tin rao - Chợ Tốt sử dụng div.cdonovt cho mỗi tin rao
      const listings = await page.evaluate((config) => {
        const adDivs = Array.from(document.querySelectorAll('div.cdonovt'));
        const results: any[] = [];

        for (const div of adDivs) {
          try {
            const link = div.querySelector('a');
            const href = link?.getAttribute('href') || '';

            // Chỉ lấy tin rao thật (có .htm), bỏ qua video và link khác
            if (!href.includes('.htm')) continue;

            // Extract ID từ URL
            const idMatch = href.match(/\/(\d+)\.htm/);
            const id = idMatch ? idMatch[1] : href;

            // Lấy toàn bộ text content
            const allText = div.textContent || '';

            // Tìm tiêu đề (text trong link, bỏ phần badge)
            const titleSpan = div.querySelector('span.bwq0cbs');
            const title = titleSpan?.textContent?.trim() || allText.split('\n')[0].substring(0, 100);

            // Tìm giá (pattern: số.số.số đ)
            const priceMatch = allText.match(/([\d.]+\.[\d.]+)\s*đ/);
            const priceText = priceMatch ? priceMatch[1] : '0';

            // Parse giá
            const price = parseInt(priceText.replace(/\./g, ''), 10) || 0;

            // Tìm location từ URL (pattern: mua-ban-dien-thoai-quan-ba-dinh-ha-noi)
            const urlLocationMatch = href.match(/-(quan|huyen|thanh-pho|thi-xa)-([\w-]+)-ha-noi/);
            let location = '';
            if (urlLocationMatch) {
              // Convert từ slug sang tên thật
              const type = urlLocationMatch[1]
                .replace('quan', 'Quận')
                .replace('huyen', 'Huyện')
                .replace('thanh-pho', 'Thành phố')
                .replace('thi-xa', 'Thị xã');
              const name = urlLocationMatch[2].split('-').map((word: string) =>
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
              location = `${type} ${name}`;
            }

            // Lấy image URL
            const img = div.querySelector('img');
            const imageUrl = img?.getAttribute('src') || '';

            results.push({
              id,
              title,
              price,
              url: href.startsWith('http') ? href : `https://www.chotot.com${href.split('?')[0].split('#')[0]}`,
              location: location || undefined,
              imageUrl: imageUrl && !imageUrl.includes('data:image') ? imageUrl : undefined,
              timestamp: Date.now(),
            });
          } catch (error) {
            // Skip error items
          }
        }

        return results;
      }, { minPrice: this.config.minPrice, maxPrice: this.config.maxPrice });

      console.log(`Tìm thấy ${listings.length} tin rao trên trang`);

      // Lọc theo giá
      let filteredListings = listings.filter(listing =>
        this.isPriceInRange(listing.price)
      );

      console.log(`Sau khi lọc giá: ${filteredListings.length} tin rao`);

      // Lọc theo keywords (nếu có)
      if (this.config.keywords.length > 0) {
        filteredListings = filteredListings.filter(listing =>
          this.matchesKeywords(listing.title)
        );
        console.log(`Sau khi lọc từ khóa: ${filteredListings.length} tin rao`);
      }

      console.log(`✓ Đã scrape ${filteredListings.length} tin rao hợp lệ`);

      await page.close();
      return filteredListings;
    } catch (error) {
      console.error('Lỗi khi scrape:', error);
      await page.close();
      // Trả về null để báo hiệu scrape thất bại
      // Điều này giúp phân biệt giữa "không có tin rao" (mảng rỗng []) và "scrape lỗi" (null)
      return null;
    }
  }

  private isPriceInRange(price: number): boolean {
    return price >= this.config.minPrice && price <= this.config.maxPrice;
  }

  private matchesKeywords(title: string): boolean {
    // Nếu không có keywords, bỏ qua filter này
    if (this.config.keywords.length === 0) {
      return true;
    }

    const titleLower = title.toLowerCase();

    // Kiểm tra xem title có chứa ít nhất một trong các keywords không
    return this.config.keywords.some(keyword =>
      titleLower.includes(keyword)
    );
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('✓ Đã đóng trình duyệt');
    }
  }
}
