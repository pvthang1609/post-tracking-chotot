export interface Listing {
  id: string;
  title: string;
  price: number;
  url: string;
  location?: string;
  imageUrl?: string;
  timestamp: number;
}

export interface TelegramBot {
  name: string;
  botToken: string;
  chatId: string;
}

export interface TrackingGroup {
  name: string;
  keywords: string[];
  minPrice: number;
  maxPrice: number;
  telegramBots: string[]; // Tên của các bot để gửi thông báo
}

export interface Config {
  categoryUrl: string;
  checkInterval: number;
  trackingGroups: TrackingGroup[];
  telegramBots: TelegramBot[];
  email: {
    service: string;
    user: string;
    password: string;
    notifyEmail: string;
  };
  browser: {
    headless: boolean;
  };
}
