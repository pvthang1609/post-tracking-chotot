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
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'NOTIFY_EMAIL'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
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
      user: process.env.EMAIL_USER!,
      password: process.env.EMAIL_PASSWORD!,
      notifyEmail: process.env.NOTIFY_EMAIL!,
    },
    browser: {
      headless: process.env.HEADLESS !== 'false',
    },
  };
}
