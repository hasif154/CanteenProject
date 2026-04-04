import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { CanteenMap, Order, AdminSession, MenuJson } from '@/types';

// UUID is only available server-side; safe in API routes
// We lazy-import it so the module doesn't blow up on the client side.

const MENU_PATH = path.join(process.cwd(), 'data', 'menu.json');

class Store {
  canteenMenus: CanteenMap = {};
  menuVersionCounter = 0;
  adminSessions: Map<string, AdminSession> = new Map();
  canteenActiveAdmin: Map<string, string> = new Map(); // canteenId -> token
  orders: Map<string, Order> = new Map();
  private menuLoaded = false;

  async loadMenu(): Promise<boolean> {
    try {
      const raw = await fs.promises.readFile(MENU_PATH, 'utf8');
      const data: MenuJson = JSON.parse(raw);
      this.canteenMenus = {};
      for (const [id, canteen] of Object.entries(data.canteens)) {
        this.canteenMenus[id] = {
          name: canteen.name,
          menuVersion: canteen.menuVersion,
          lastUpdated: canteen.lastUpdated,
          items: canteen.items,
        };
      }
      this.menuLoaded = true;
      return true;
    } catch (err) {
      console.error('❌ Failed to load menu.json:', err);
      return false;
    }
  }

  async ensureMenu() {
    if (!this.menuLoaded) await this.loadMenu();
  }

  async saveMenu(): Promise<boolean> {
    try {
      const data: MenuJson = { canteens: {} };
      for (const [id, canteen] of Object.entries(this.canteenMenus)) {
        data.canteens[id] = {
          ...canteen,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
      }
      await fs.promises.writeFile(MENU_PATH, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('❌ Failed to save menu.json:', err);
      return false;
    }
  }

  createAdminSession(canteenId: string): string {
    const existing = this.canteenActiveAdmin.get(canteenId);
    if (existing) this.adminSessions.delete(existing);
    const token = uuidv4();
    this.adminSessions.set(token, { canteenId, loginTime: new Date().toISOString() });
    this.canteenActiveAdmin.set(canteenId, token);
    return token;
  }

  validateAdminSession(token: string): AdminSession | null {
    return this.adminSessions.get(token) ?? null;
  }

  destroyAdminSession(token: string) {
    const session = this.adminSessions.get(token);
    if (session) {
      const active = this.canteenActiveAdmin.get(session.canteenId);
      if (active === token) this.canteenActiveAdmin.delete(session.canteenId);
      this.adminSessions.delete(token);
    }
  }

  getMenuItemById(canteenId: string, itemId: string) {
    return this.canteenMenus[canteenId]?.items.find((i) => i.id === itemId) ?? null;
  }

  generateOrderId(): string {
    return uuidv4().substring(0, 8);
  }
}

// Singleton — persists in-memory across hot-reloads in dev
const globalStore = global as typeof global & { __canteenStore?: Store };
if (!globalStore.__canteenStore) {
  globalStore.__canteenStore = new Store();
}
export const store = globalStore.__canteenStore;
