import { chromium, Browser } from 'playwright';
import { Listing, Config, TrackingGroup } from '../types';

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
    console.log('[OK] Browser started');
  }

  async scrapeAllListings(): Promise<Listing[] | null> {
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

      await page.goto(this.config.categoryUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForSelector('div.cdonovt', { timeout: 10000 });

      // Lấy tất cả tin rao (không lọc)
      const listings = await page.evaluate(() => {
        const adDivs = Array.from(document.querySelectorAll('div.cdonovt'));
        const results: any[] = [];

        for (const div of adDivs) {
          try {
            const link = div.querySelector('a');
            const href = link?.getAttribute('href') || '';

            if (!href.includes('.htm')) continue;

            const idMatch = href.match(/\/(\d+)\.htm/);
            const id = idMatch ? idMatch[1] : href;

            const allText = div.textContent || '';

            const titleSpan = div.querySelector('span.bwq0cbs');
            const title = titleSpan?.textContent?.trim() || allText.split('\n')[0].substring(0, 100);

            const priceMatch = allText.match(/([\d.]+\.[\d.]+)\s*đ/);
            const priceText = priceMatch ? priceMatch[1] : '0';
            const price = parseInt(priceText.replace(/\./g, ''), 10) || 0;

            const urlLocationMatch = href.match(/-(quan|huyen|thanh-pho|thi-xa)-([\w-]+)-ha-noi/);
            let location = '';
            if (urlLocationMatch) {
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
          } catch {
            // Skip error items
          }
        }

        return results;
      });

      console.log(`[OK] Scraped ${listings.length} listings`);

      await page.close();
      return listings;
    } catch (error) {
      console.error('Lỗi khi scrape:', error);
      await page.close();
      return null;
    }
  }

  filterListingsForGroup(listings: Listing[], group: TrackingGroup): Listing[] {
    return listings.filter(listing => {
      // Kiểm tra khoảng giá
      if (listing.price < group.minPrice || listing.price > group.maxPrice) {
        return false;
      }

      // Kiểm tra keywords
      const titleLower = listing.title.toLowerCase();
      return group.keywords.some(keyword => titleLower.includes(keyword));
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('[OK] Browser closed');
    }
  }
}
