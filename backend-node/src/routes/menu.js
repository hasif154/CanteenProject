const express = require('express');
const path = require('path');
const fs = require('fs');
const store = require('../store');
const { requireAdmin } = require('../middlewares/auth');
const upload = require('../config/upload');

const router = express.Router();

// ============================================
// API: Canteens List
// ============================================
router.get('/canteens', (req, res) => {
    const canteens = Object.entries(store.canteenMenus).map(([id, data]) => ({
        id,
        name: data.name
    }));
    res.json({ success: true, canteens });
});

// ============================================
// API: Menu (per canteen, async)
// ============================================
router.get('/menu/:canteenId', async (req, res) => {
    const { canteenId } = req.params;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    res.json({
        success: true,
        canteenId,
        canteenName: canteen.name,
        menu: canteen.items,
        menuVersion: store.menuVersionCounter
    });
});

// Menu version check (for live polling)
router.get('/menu-version', (req, res) => {
    res.json({ success: true, version: store.menuVersionCounter });
});

// ============================================
// API: Admin Menu Management
// ============================================
router.post('/admin/menu/toggle', requireAdmin, async (req, res) => {
    const { itemId, available } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    const item = canteen.items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    item.available = available;
    store.menuVersionCounter++;

    // Persist to disk
    await store.saveMenu();

    console.log(`🔄 ${canteen.name}: "${item.name}" → ${available ? '✅ Available' : '❌ Not Available'}`);

    res.json({
        success: true,
        item: { id: item.id, name: item.name, available: item.available },
        menuVersion: store.menuVersionCounter,
        message: `${item.name} is now ${available ? 'available' : 'not available'}`
    });
});

// Bulk toggle
router.post('/admin/menu/bulk-toggle', requireAdmin, async (req, res) => {
    const { available } = req.body; // true = all available, false = all unavailable
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    canteen.items.forEach(item => { item.available = available; });
    store.menuVersionCounter++;

    await store.saveMenu();

    console.log(`🔄 ${canteen.name}: All items → ${available ? '✅ Available' : '❌ Not Available'}`);

    res.json({
        success: true,
        menuVersion: store.menuVersionCounter,
        message: `All items are now ${available ? 'available' : 'not available'}`
    });
});

// Admin get menu (includes all items regardless of availability)
router.get('/admin/menu', requireAdmin, (req, res) => {
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    res.json({
        success: true,
        canteenId,
        canteenName: canteen.name,
        menu: canteen.items,
        menuVersion: store.menuVersionCounter
    });
});

// Force menu refresh from disk
router.post('/admin/menu/refresh', requireAdmin, async (req, res) => {
    const success = await store.loadMenu();
    if (success) {
        store.menuVersionCounter++;
        res.json({ success: true, menuVersion: store.menuVersionCounter, message: 'Menu refreshed from disk' });
    } else {
        res.status(500).json({ success: false, error: 'Failed to reload menu' });
    }
});

// Add new menu item
router.post('/admin/menu/add', requireAdmin, async (req, res) => {
    const { name, price, category, emoji, isVeg } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    if (!name || !price || !category) {
        return res.status(400).json({ success: false, error: 'Name, price, and category are required' });
    }

    if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ success: false, error: 'Price must be a positive number' });
    }

    // Generate a unique ID from the name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check for duplicate ID or duplicate name (case-insensitive)
    if (canteen.items.find(item => item.id === id)) {
        return res.status(400).json({ success: false, error: `An item with a similar name already exists` });
    }
    const nameLower = name.trim().toLowerCase();
    if (canteen.items.find(item => item.name.toLowerCase() === nameLower)) {
        return res.status(400).json({ success: false, error: `"${name.trim()}" already exists in the menu` });
    }

    const newItem = {
        id,
        name: name.trim(),
        price: Math.round(price),
        category: category.trim(),
        emoji: emoji || null,
        isVeg: isVeg !== undefined ? isVeg : true,
        image: null,
        available: true
    };

    canteen.items.push(newItem);
    store.menuVersionCounter++;
    await store.saveMenu();

    console.log(`➕ [${canteen.name}] New item added: "${newItem.name}" - ₹${newItem.price}`);

    res.status(201).json({
        success: true,
        item: newItem,
        menuVersion: store.menuVersionCounter,
        message: `"${newItem.name}" has been added to the menu`
    });
});

// Edit existing menu item
router.put('/admin/menu/edit', requireAdmin, async (req, res) => {
    const { itemId, name, price, category, emoji, isVeg } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    const item = canteen.items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    if (name) item.name = name.trim();
    if (price !== undefined && typeof price === 'number' && price > 0) item.price = Math.round(price);
    if (category) item.category = category.trim();
    if (emoji) item.emoji = emoji;
    if (isVeg !== undefined) item.isVeg = isVeg;

    store.menuVersionCounter++;
    await store.saveMenu();

    console.log(`✏️ [${canteen.name}] Item edited: "${item.name}" - ₹${item.price}`);

    res.json({
        success: true,
        item,
        menuVersion: store.menuVersionCounter,
        message: `"${item.name}" has been updated`
    });
});

// Upload image for a menu item
router.post('/admin/menu/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
    const { itemId } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const item = canteen.items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    // Delete old image if exists
    if (item.image) {
        const oldPath = path.join(__dirname, '../../', item.image.replace('/uploads/', 'uploads/'));
        try { fs.unlinkSync(oldPath); } catch { }
    }

    item.image = '/uploads/' + req.file.filename;
    store.menuVersionCounter++;
    await store.saveMenu();

    console.log(`📸 [${canteen.name}] Image uploaded for "${item.name}": ${item.image}`);

    res.json({
        success: true,
        item,
        menuVersion: store.menuVersionCounter,
        message: `Image uploaded for "${item.name}"`
    });
});

// Delete menu item
router.delete('/admin/menu/delete', requireAdmin, async (req, res) => {
    const { itemId } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = store.canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }

    const itemIndex = canteen.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    const removedItem = canteen.items.splice(itemIndex, 1)[0];
    store.menuVersionCounter++;
    await store.saveMenu();

    console.log(`🗑️ [${canteen.name}] Item deleted: "${removedItem.name}"`);

    res.json({
        success: true,
        removedItem,
        menuVersion: store.menuVersionCounter,
        message: `"${removedItem.name}" has been removed from the menu`
    });
});

module.exports = router;
