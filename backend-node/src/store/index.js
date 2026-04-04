const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MENU_PATH = path.join(__dirname, '../../menu.json');

class Store {
    constructor() {
        this.canteenMenus = {}; // { 'advanced-canteen': { name, items }, 'main-canteen': { name, items } }
        this.menuVersionCounter = 0;
        this.adminSessions = new Map(); // token -> { canteenId, loginTime }
        this.canteenActiveAdmin = new Map(); // canteenId -> token
        this.orders = new Map(); // orderId -> order
    }

    async loadMenu() {
        try {
            const menuData = JSON.parse(await fs.promises.readFile(MENU_PATH, 'utf8'));
            this.canteenMenus = {};
            for (const [canteenId, canteen] of Object.entries(menuData.canteens)) {
                this.canteenMenus[canteenId] = {
                    name: canteen.name,
                    menuVersion: canteen.menuVersion,
                    lastUpdated: canteen.lastUpdated,
                    items: canteen.items
                };
                console.log(`📋 ${canteen.name}: ${canteen.items.length} items loaded`);
            }
            return true;
        } catch (error) {
            console.error('❌ Failed to load menu.json:', error.message);
            return false;
        }
    }

    async saveMenu() {
        try {
            const menuData = { canteens: {} };
            for (const [canteenId, canteen] of Object.entries(this.canteenMenus)) {
                menuData.canteens[canteenId] = {
                    name: canteen.name,
                    menuVersion: canteen.menuVersion,
                    lastUpdated: new Date().toISOString().split('T')[0],
                    items: canteen.items
                };
            }
            await fs.promises.writeFile(MENU_PATH, JSON.stringify(menuData, null, 4), 'utf8');
            console.log('💾 Menu saved to disk');
            return true;
        } catch (error) {
            console.error('❌ Failed to save menu.json:', error.message);
            return false;
        }
    }

    createAdminSession(canteenId) {
        const existingToken = this.canteenActiveAdmin.get(canteenId);
        if (existingToken) {
            this.adminSessions.delete(existingToken);
            console.log(`🔒 Previous admin session for ${canteenId} invalidated`);
        }

        const token = uuidv4();
        this.adminSessions.set(token, {
            canteenId,
            loginTime: new Date().toISOString()
        });
        this.canteenActiveAdmin.set(canteenId, token);
        console.log(`🔑 Admin session created for ${canteenId}`);
        return token;
    }

    validateAdminSession(token) {
        return this.adminSessions.get(token) || null;
    }

    destroyAdminSession(token) {
        const session = this.adminSessions.get(token);
        if (session) {
            const activeToken = this.canteenActiveAdmin.get(session.canteenId);
            if (activeToken === token) {
                this.canteenActiveAdmin.delete(session.canteenId);
            }
            this.adminSessions.delete(token);
            console.log(`🔓 Admin session destroyed for ${session.canteenId}`);
        }
    }

    getMenuItemById(canteenId, itemId) {
        const canteen = this.canteenMenus[canteenId];
        if (!canteen) return null;
        return canteen.items.find(item => item.id === itemId);
    }

    generateOrderId() {
        return uuidv4().substring(0, 8);
    }

    getValidCanteenIds() {
        return Object.keys(this.canteenMenus);
    }
}

// Export a singleton instance
module.exports = new Store();
