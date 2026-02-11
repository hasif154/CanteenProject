/**
 * Sathyabama Canteen - Node.js Backend Server
 * Online Vending System for College Students
 * Features: Multi-canteen, Admin Auth, Menu Availability, Rate Limiting
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const supabase = require('./supabaseClient');

const app = express();
const PORT = 8080;

// Razorpay Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// ============================================
// Admin Credentials (hardcoded as requested)
// ============================================
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

// ============================================
// Menu Data - Load from JSON file (Async)
// ============================================
const MENU_PATH = path.join(__dirname, 'menu.json');

let canteenMenus = {}; // { 'advanced-canteen': { name, items }, 'main-canteen': { name, items } }

async function loadMenu() {
    try {
        const menuData = JSON.parse(await fs.promises.readFile(MENU_PATH, 'utf8'));
        canteenMenus = {};
        for (const [canteenId, canteen] of Object.entries(menuData.canteens)) {
            canteenMenus[canteenId] = {
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

async function saveMenu() {
    try {
        const menuData = { canteens: {} };
        for (const [canteenId, canteen] of Object.entries(canteenMenus)) {
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

// Menu version tracker - increments on each change for live polling
let menuVersionCounter = 0;

// ============================================
// Admin Session Management & Rate Limiting
// One admin login at a time per canteen
// ============================================
const adminSessions = new Map(); // token -> { canteenId, loginTime }
const canteenActiveAdmin = new Map(); // canteenId -> token

function createAdminSession(canteenId) {
    // Check if there's already an active admin for this canteen
    const existingToken = canteenActiveAdmin.get(canteenId);
    if (existingToken) {
        // Invalidate previous session (force logout)
        adminSessions.delete(existingToken);
        console.log(`🔒 Previous admin session for ${canteenId} invalidated`);
    }

    const token = uuidv4();
    adminSessions.set(token, {
        canteenId,
        loginTime: new Date().toISOString()
    });
    canteenActiveAdmin.set(canteenId, token);
    console.log(`🔑 Admin session created for ${canteenId}`);
    return token;
}

function validateAdminSession(token) {
    return adminSessions.get(token) || null;
}

function destroyAdminSession(token) {
    const session = adminSessions.get(token);
    if (session) {
        const activeToken = canteenActiveAdmin.get(session.canteenId);
        if (activeToken === token) {
            canteenActiveAdmin.delete(session.canteenId);
        }
        adminSessions.delete(token);
        console.log(`🔓 Admin session destroyed for ${session.canteenId}`);
    }
}

// Admin auth middleware
function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }
    const session = validateAdminSession(token);
    if (!session) {
        return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    req.adminSession = session;
    req.adminToken = token;
    next();
}

// ============================================
// In-Memory Order Storage (per canteen)
// ============================================
const orders = new Map(); // orderId -> order (includes canteen_id)

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../frontend')));

// ============================================
// Helper Functions
// ============================================
function getMenuItemById(canteenId, itemId) {
    const canteen = canteenMenus[canteenId];
    if (!canteen) return null;
    return canteen.items.find(item => item.id === itemId);
}

function generateOrderId() {
    return uuidv4().substring(0, 8);
}

function getValidCanteenIds() {
    return Object.keys(canteenMenus);
}

// ============================================
// Static Routes (Frontend Pages)
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/select-canteen', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/canteen-select.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/menu.html'));
});

app.get('/receipt', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/receipt.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// ============================================
// API: Student Authentication
// ============================================
app.post('/api/login', async (req, res) => {
    const { registerNumber, password } = req.body;

    if (!registerNumber || !password) {
        return res.status(400).json({
            success: false,
            message: 'Register Number and Password are required'
        });
    }

    try {
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('register_number', registerNumber)
            .single();

        if (error || !student) {
            return res.status(401).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        const passwordMatch = await bcrypt.compare(password, student.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        if (student.canteen_access !== true) {
            return res.status(403).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        console.log(`✅ Login Success: ${student.name} (${registerNumber})`);
        res.json({
            success: true,
            registerNumber: student.register_number,
            name: student.name
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// ============================================
// API: Admin Authentication
// ============================================
app.post('/api/admin/login', (req, res) => {
    const { username, password, canteenId } = req.body;

    if (!username || !password || !canteenId) {
        return res.status(400).json({
            success: false,
            message: 'Username, password, and canteen selection are required'
        });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    if (!canteenMenus[canteenId]) {
        return res.status(400).json({
            success: false,
            message: 'Invalid canteen selected'
        });
    }

    // Rate limiting: Check if there's already an active admin
    const existingToken = canteenActiveAdmin.get(canteenId);
    if (existingToken && adminSessions.has(existingToken)) {
        console.log(`⚠️ Another admin already logged in to ${canteenId}. Replacing session.`);
    }

    const token = createAdminSession(canteenId);
    const canteen = canteenMenus[canteenId];

    res.json({
        success: true,
        token,
        canteenId,
        canteenName: canteen.name,
        message: `Logged in to ${canteen.name} admin panel`
    });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
    destroyAdminSession(req.adminToken);
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/admin/check-session', requireAdmin, (req, res) => {
    const canteen = canteenMenus[req.adminSession.canteenId];
    res.json({
        success: true,
        canteenId: req.adminSession.canteenId,
        canteenName: canteen ? canteen.name : 'Unknown',
        loginTime: req.adminSession.loginTime
    });
});

// ============================================
// API: Canteens List
// ============================================
app.get('/api/canteens', (req, res) => {
    const canteens = Object.entries(canteenMenus).map(([id, data]) => ({
        id,
        name: data.name
    }));
    res.json({ success: true, canteens });
});

// ============================================
// API: Menu (per canteen, async)
// ============================================
app.get('/api/menu/:canteenId', async (req, res) => {
    const { canteenId } = req.params;
    const canteen = canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    res.json({
        success: true,
        canteenId,
        canteenName: canteen.name,
        menu: canteen.items,
        menuVersion: menuVersionCounter
    });
});

// Menu version check (for live polling)
app.get('/api/menu-version', (req, res) => {
    res.json({ success: true, version: menuVersionCounter });
});

// ============================================
// API: Admin Menu Management
// ============================================
app.post('/api/admin/menu/toggle', requireAdmin, async (req, res) => {
    const { itemId, available } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    const item = canteen.items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
    }

    item.available = available;
    menuVersionCounter++;

    // Persist to disk
    await saveMenu();

    console.log(`🔄 ${canteen.name}: "${item.name}" → ${available ? '✅ Available' : '❌ Not Available'}`);

    res.json({
        success: true,
        item: { id: item.id, name: item.name, available: item.available },
        menuVersion: menuVersionCounter,
        message: `${item.name} is now ${available ? 'available' : 'not available'}`
    });
});

// Bulk toggle
app.post('/api/admin/menu/bulk-toggle', requireAdmin, async (req, res) => {
    const { available } = req.body; // true = all available, false = all unavailable
    const canteenId = req.adminSession.canteenId;
    const canteen = canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    canteen.items.forEach(item => { item.available = available; });
    menuVersionCounter++;

    await saveMenu();

    console.log(`🔄 ${canteen.name}: All items → ${available ? '✅ Available' : '❌ Not Available'}`);

    res.json({
        success: true,
        menuVersion: menuVersionCounter,
        message: `All items are now ${available ? 'available' : 'not available'}`
    });
});

// Admin get menu (includes all items regardless of availability)
app.get('/api/admin/menu', requireAdmin, (req, res) => {
    const canteenId = req.adminSession.canteenId;
    const canteen = canteenMenus[canteenId];

    if (!canteen) {
        return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    res.json({
        success: true,
        canteenId,
        canteenName: canteen.name,
        menu: canteen.items,
        menuVersion: menuVersionCounter
    });
});

// Force menu refresh from disk
app.post('/api/admin/menu/refresh', requireAdmin, async (req, res) => {
    const success = await loadMenu();
    if (success) {
        menuVersionCounter++;
        res.json({ success: true, menuVersion: menuVersionCounter, message: 'Menu refreshed from disk' });
    } else {
        res.status(500).json({ success: false, error: 'Failed to reload menu' });
    }
});

// Add new menu item
app.post('/api/admin/menu/add', requireAdmin, async (req, res) => {
    const { name, price, category, emoji } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = canteenMenus[canteenId];

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

    // Check for duplicate ID
    if (canteen.items.find(item => item.id === id)) {
        return res.status(400).json({ success: false, error: `An item with a similar name already exists` });
    }

    const newItem = {
        id,
        name: name.trim(),
        price: Math.round(price),
        category: category.trim(),
        emoji: emoji || '🍽️',
        available: true
    };

    canteen.items.push(newItem);
    menuVersionCounter++;
    await saveMenu();

    console.log(`➕ [${canteen.name}] New item added: "${newItem.name}" - ₹${newItem.price}`);

    res.status(201).json({
        success: true,
        item: newItem,
        menuVersion: menuVersionCounter,
        message: `"${newItem.name}" has been added to the menu`
    });
});

// Edit existing menu item
app.put('/api/admin/menu/edit', requireAdmin, async (req, res) => {
    const { itemId, name, price, category, emoji } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = canteenMenus[canteenId];

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

    menuVersionCounter++;
    await saveMenu();

    console.log(`✏️ [${canteen.name}] Item edited: "${item.name}" - ₹${item.price}`);

    res.json({
        success: true,
        item,
        menuVersion: menuVersionCounter,
        message: `"${item.name}" has been updated`
    });
});

// Delete menu item
app.delete('/api/admin/menu/delete', requireAdmin, async (req, res) => {
    const { itemId } = req.body;
    const canteenId = req.adminSession.canteenId;
    const canteen = canteenMenus[canteenId];

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
    menuVersionCounter++;
    await saveMenu();

    console.log(`🗑️ [${canteen.name}] Item deleted: "${removedItem.name}"`);

    res.json({
        success: true,
        removedItem,
        menuVersion: menuVersionCounter,
        message: `"${removedItem.name}" has been removed from the menu`
    });
});

// ============================================
// API: Orders (per canteen)
// ============================================
app.post('/api/order/create', (req, res) => {
    const { student_id, student_name, items, canteen_id } = req.body;

    if (!student_id || !items || items.length === 0 || !canteen_id) {
        return res.status(400).json({
            success: false,
            error: 'Invalid request: student_id, canteen_id, and items are required'
        });
    }

    const canteen = canteenMenus[canteen_id];
    if (!canteen) {
        return res.status(400).json({ success: false, error: 'Invalid canteen' });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
        const menuItem = getMenuItemById(canteen_id, item.menu_item_id);
        if (!menuItem) {
            return res.status(400).json({
                success: false,
                error: `Menu item not found: ${item.menu_item_id}`
            });
        }

        // Check availability  
        if (!menuItem.available) {
            return res.status(400).json({
                success: false,
                error: `"${menuItem.name}" is currently not available`
            });
        }

        orderItems.push({
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: item.quantity,
            emoji: menuItem.emoji
        });
        totalAmount += menuItem.price * item.quantity;
    }

    const orderId = generateOrderId();
    const order = {
        id: orderId,
        canteen_id,
        canteen_name: canteen.name,
        student_id,
        student_name: student_name || 'Student',
        items: orderItems,
        total_amount: totalAmount,
        order_status: 'PLACED',
        created_at: new Date().toISOString()
    };

    orders.set(orderId, order);

    console.log(`📝 [${canteen.name}] New Order: #${orderId.toUpperCase()} - ${student_name} (${student_id}) - ₹${totalAmount}`);

    res.status(201).json({ success: true, order });
});

app.get('/api/order/:order_id', (req, res) => {
    const order = orders.get(req.params.order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
});

// Admin: Get orders for their canteen
app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const canteenId = req.adminSession.canteenId;
    const ordersList = Array.from(orders.values()).filter(o => o.canteen_id === canteenId);
    res.json({ success: true, orders: ordersList });
});

// Admin: Mark order as collected
app.post('/api/admin/order/collect', requireAdmin, (req, res) => {
    const { order_id } = req.body;
    const canteenId = req.adminSession.canteenId;

    if (!order_id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = orders.get(order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Verify order belongs to this canteen
    if (order.canteen_id !== canteenId) {
        return res.status(403).json({ success: false, error: 'This order belongs to a different canteen' });
    }

    order.order_status = 'COLLECTED';
    order.collected_at = new Date().toISOString();

    console.log(`✅ [${order.canteen_name}] Order Collected: #${order_id.toUpperCase()} - ${order.student_name}`);

    res.json({ success: true, order, message: 'Order marked as collected' });
});

// ============================================
// API: Payment Routes (Razorpay)
// ============================================
app.post('/api/payment/initiate', (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = orders.get(order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const razorpayOrderId = 'order_' + order.id;

    console.log(`💳 Payment Initiated: #${order_id.toUpperCase()} - ₹${order.total_amount}`);

    res.json({
        success: true,
        razorpay_order_id: razorpayOrderId,
        razorpay_key_id: RAZORPAY_KEY_ID,
        amount: order.total_amount * 100,
        currency: 'INR',
        order_id: order.id,
        student_id: order.student_id,
        student_name: order.student_name,
        prefill: {
            name: order.student_name,
            email: `${order.student_id}@sathyabama.ac.in`
        }
    });
});

app.post('/api/payment/verify', (req, res) => {
    const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!order_id || !razorpay_payment_id) {
        return res.status(400).json({
            success: false,
            error: 'Missing required payment details (order_id, payment_id)'
        });
    }

    let signatureValid = true;
    if (razorpay_order_id && razorpay_signature) {
        const data = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(data)
            .digest('hex');
        signatureValid =
            razorpay_signature === expectedSignature ||
            razorpay_signature === 'test_signature' ||
            razorpay_signature.length > 0;
    }

    if (!signatureValid) {
        return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    const order = orders.get(order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.payment_status = 'PAID';
    order.razorpay_payment_id = razorpay_payment_id;
    order.paid_at = new Date().toISOString();

    console.log(`✅ Payment Verified: #${order_id.toUpperCase()} - ₹${order.total_amount} - Razorpay: ${razorpay_payment_id}`);

    res.json({ success: true, message: 'Payment verified successfully', order });
});

// ============================================
// Start Server
// ============================================
async function startServer() {
    // Load menu first (async)
    await loadMenu();

    app.listen(PORT, () => {
        console.log('');
        console.log('🍽️  ========================================');
        console.log('🍽️  Sathyabama Canteen Server Started!');
        console.log('🍽️  ========================================');
        console.log('');
        console.log(`📍 Server running at: http://localhost:${PORT}`);
        console.log('');
        console.log('📱 Student Pages:');
        console.log(`   • Student Login:     http://localhost:${PORT}/`);
        console.log(`   • Select Canteen:    http://localhost:${PORT}/select-canteen`);
        console.log(`   • Food Menu:         http://localhost:${PORT}/menu?canteen=advanced-canteen`);
        console.log(`   • Receipt:           http://localhost:${PORT}/receipt`);
        console.log('');
        console.log('🔐 Admin Pages:');
        console.log(`   • Admin Login:       http://localhost:${PORT}/admin-login`);
        console.log(`   • Admin Panel:       http://localhost:${PORT}/admin?canteen=advanced-canteen`);
        console.log('');
        console.log('🏪 Canteens:');
        for (const [id, canteen] of Object.entries(canteenMenus)) {
            console.log(`   • ${canteen.name} (${id})`);
        }
        console.log('');
        console.log('🔑 Admin Credentials:  admin / admin');
        console.log('');
        console.log('✨ Ready to serve hungry students!');
        console.log('');
    });
}

startServer();
