import * as dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

export function loadConfig(): Config {
  const required = [
    'CATEGORY_URL',
    'REGION',
    'MIN_PRICE',
    'MAX_PRICE',
    'CHECK_INTERVAL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Check nếu không có Telegram thì phải có Email
  const telegramEnabled = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const emailEnabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.NOTIFY_EMAIL);

  if (!telegramEnabled && !emailEnabled) {
    throw new Error('Phải cấu hình ít nhất một kênh thông báo: Telegram hoặc Email');
  }

  // Parse keywords từ chuỗi phân cách bởi dấu phẩy
  const keywordsString = process.env.KEYWORDS || '';
  const keywords = keywordsString
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  return {
    categoryUrl: process.env.CATEGORY_URL!,
    region: process.env.REGION!,
    minPrice: parseInt(process.env.MIN_PRICE!, 10),
    maxPrice: parseInt(process.env.MAX_PRICE!, 10),
    keywords,
    checkInterval: parseInt(process.env.CHECK_INTERVAL!, 10),
    email: {
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      notifyEmail: process.env.NOTIFY_EMAIL || '',
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      enabled: telegramEnabled,
    },
    browser: {
      headless: process.env.HEADLESS !== 'false',
    },
  };
}
