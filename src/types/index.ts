export interface Listing {
  id: string;
  title: string;
  price: number;
  url: string;
  location?: string;
  imageUrl?: string;
  timestamp: number;
}

export interface Config {
  categoryUrl: string;
  region: string;
  minPrice: number;
  maxPrice: number;
  keywords: string[];
  checkInterval: number;
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
