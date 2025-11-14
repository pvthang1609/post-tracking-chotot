import * as fs from 'fs';
import * as path from 'path';
import { Listing } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'snapshot.json');

export class Storage {
  constructor() {
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  saveSnapshot(listings: Listing[]): void {
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(listings, null, 2), 'utf-8');
    console.log(`✓ Đã lưu ${listings.length} tin rao vào snapshot`);
  }

  loadSnapshot(): Listing[] {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return [];
    }

    try {
      const data = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Lỗi khi đọc snapshot:', error);
      return [];
    }
  }

  findNewListings(currentListings: Listing[], previousListings: Listing[]): Listing[] {
    const previousIds = new Set(previousListings.map(l => l.id));
    return currentListings.filter(listing => !previousIds.has(listing.id));
  }
}
