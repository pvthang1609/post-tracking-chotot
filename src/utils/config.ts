import * as dotenv from 'dotenv';
import { Config, TelegramBot, TrackingGroup } from '../types';

dotenv.config();

export function loadConfig(): Config {
  const required = [
    'CATEGORY_URL',
    'CHECK_INTERVAL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Parse Telegram bots từ env
  // Format: TELEGRAM_BOTS=bot1|token1|chatId1;bot2|token2|chatId2
  const telegramBots: TelegramBot[] = [];
  const telegramBotsString = process.env.TELEGRAM_BOTS || '';

  if (telegramBotsString) {
    const botConfigs = telegramBotsString.split(';');
    for (const botConfig of botConfigs) {
      const parts = botConfig.split('|').map(s => s.trim());
      if (parts.length >= 3) {
        const [name, botToken, chatId] = parts;
        if (name && botToken && chatId) {
          telegramBots.push({ name, botToken, chatId });
        }
      }
    }
  }

  // Parse tracking groups từ env
  // Format: TRACKING_GROUPS=group1|keyword1,keyword2|minPrice|maxPrice|bot1,bot2;group2|keyword3|minPrice|maxPrice|bot1
  const trackingGroups: TrackingGroup[] = [];
  const trackingGroupsString = process.env.TRACKING_GROUPS || '';

  if (trackingGroupsString) {
    const groupConfigs = trackingGroupsString.split(';');
    for (const groupConfig of groupConfigs) {
      const parts = groupConfig.split('|').map(s => s.trim());
      if (parts.length >= 5) {
        const [name, keywordsStr, minPriceStr, maxPriceStr, botsStr] = parts;
        const keywords = keywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        const minPrice = parseInt(minPriceStr, 10);
        const maxPrice = parseInt(maxPriceStr, 10);
        const telegramBotNames = botsStr.split(',').map(b => b.trim()).filter(b => b.length > 0);

        if (name && keywords.length > 0 && !isNaN(minPrice) && !isNaN(maxPrice)) {
          trackingGroups.push({
            name,
            keywords,
            minPrice,
            maxPrice,
            telegramBots: telegramBotNames,
          });
        }
      }
    }
  }

  // Validate: phải có ít nhất 1 tracking group và 1 telegram bot
  if (trackingGroups.length === 0) {
    throw new Error('Phải cấu hình ít nhất một tracking group (TRACKING_GROUPS)');
  }

  if (telegramBots.length === 0) {
    throw new Error('Phải cấu hình ít nhất một Telegram bot (TELEGRAM_BOTS)');
  }

  // Validate: kiểm tra các bot trong tracking groups có tồn tại
  const botNames = new Set(telegramBots.map(b => b.name));
  for (const group of trackingGroups) {
    for (const botName of group.telegramBots) {
      if (!botNames.has(botName)) {
        throw new Error(`Bot "${botName}" trong group "${group.name}" không tồn tại trong TELEGRAM_BOTS`);
      }
    }
  }

  return {
    categoryUrl: process.env.CATEGORY_URL!,
    checkInterval: parseInt(process.env.CHECK_INTERVAL!, 10),
    trackingGroups,
    telegramBots,
    email: {
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      notifyEmail: process.env.NOTIFY_EMAIL || '',
    },
    browser: {
      headless: process.env.HEADLESS !== 'false',
    },
  };
}
