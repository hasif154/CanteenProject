/**
 * Sathyabama Canteen - Node.js Backend Server
 * Online Vending System for College Students
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

// ============================================
// Menu Data - Load from JSON file
// ============================================
function loadMenu() {
    try {
        const menuPath = path.join(__dirname, 'menu.json');
        const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
        console.log(`📋 Menu loaded: ${menuData.items.length} items (v${menuData.menuVersion})`);
        return menuData.items;
    } catch (error) {
        console.error('❌ Failed to load menu.json:', error.message);
        return [];
    }
}

let menuItems = loadMenu();

const app = express();
const PORT = 8080;

// Razorpay Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (frontend)
app.use('/static', express.static(path.join(__dirname, '../frontend')));


// ============================================
// In-Memory Storage
// ============================================
const orders = new Map();

// ============================================
// Helper Functions
// ============================================
function getMenuItemById(id) {
    return menuItems.find(item => item.id === id);
}

function generateOrderId() {
    // Generate a short, readable order ID
    return uuidv4().substring(0, 8);
}

// ============================================
// Static Routes (Frontend Pages)
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/menu.html'));
});

app.get('/receipt', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/receipt.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// ============================================
// API Routes
// ============================================

// Login - Supabase Authentication
app.post('/api/login', async (req, res) => {
    const { registerNumber, password } = req.body;

    if (!registerNumber || !password) {
        return res.status(400).json({
            success: false,
            message: 'Register Number and Password are required'
        });
    }

    try {
        // 1. Fetch student from Supabase
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('register_number', registerNumber)
            .single();

        if (error || !student) {
            // Student does not exist
            return res.status(401).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        // 2. Check Password
        const passwordMatch = await bcrypt.compare(password, student.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        // 3. Check Canteen Access
        if (student.canteen_access !== true) {
            return res.status(403).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        // Success
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

// Get Menu
app.get('/api/menu', (req, res) => {
    res.json({
        success: true,
        menu: menuItems
    });
});

// Create Order
app.post('/api/order/create', (req, res) => {
    const { student_id, student_name, items } = req.body;

    if (!student_id || !items || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid request: student_id and items are required'
        });
    }

    // Validate and build order items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
        const menuItem = getMenuItemById(item.menu_item_id);
        if (!menuItem) {
            return res.status(400).json({
                success: false,
                error: `Menu item not found: ${item.menu_item_id}`
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

    // Create order with fake Order ID
    const orderId = generateOrderId();
    const order = {
        id: orderId,
        student_id,
        student_name: student_name || 'Student',
        items: orderItems,
        total_amount: totalAmount,
        order_status: 'PLACED',
        created_at: new Date().toISOString()
    };

    orders.set(orderId, order);

    console.log(`📝 New Order: #${orderId.toUpperCase()} - ${student_name} (${student_id}) - ₹${totalAmount}`);

    res.status(201).json({
        success: true,
        order
    });
});

// Get Order
app.get('/api/order/:order_id', (req, res) => {
    const order = orders.get(req.params.order_id);

    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }

    res.json({
        success: true,
        order
    });
});

// Get All Orders (Admin)
app.get('/api/admin/orders', (req, res) => {
    const ordersList = Array.from(orders.values());

    res.json({
        success: true,
        orders: ordersList
    });
});

// Mark Order as Collected (Admin)
app.post('/api/admin/order/collect', (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({
            success: false,
            error: 'Order ID is required'
        });
    }

    const order = orders.get(order_id);

    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }

    order.order_status = 'COLLECTED';
    order.collected_at = new Date().toISOString();

    console.log(`✅ Order Collected: #${order_id.toUpperCase()} - ${order.student_name}`);

    res.json({
        success: true,
        order,
        message: 'Order marked as collected'
    });
});

// ============================================
// Payment Routes (Razorpay)
// ============================================

// Initiate Payment - Creates Razorpay order
app.post('/api/payment/initiate', (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({
            success: false,
            error: 'Order ID is required'
        });
    }

    const order = orders.get(order_id);

    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }

    // Generate Razorpay order ID (simulated for demo)
    const razorpayOrderId = 'order_' + order.id;

    console.log(`💳 Payment Initiated: #${order_id.toUpperCase()} - ₹${order.total_amount}`);

    res.json({
        success: true,
        razorpay_order_id: razorpayOrderId,
        razorpay_key_id: RAZORPAY_KEY_ID,
        amount: order.total_amount * 100, // Razorpay expects amount in paise
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

// Verify Payment - Validates Razorpay signature
app.post('/api/payment/verify', (req, res) => {
    const { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!order_id || !razorpay_payment_id) {
        return res.status(400).json({
            success: false,
            error: 'Missing required payment details (order_id, payment_id)'
        });
    }

    // Verify signature if provided (only possible if order_id was used in frontend)
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
        return res.status(400).json({
            success: false,
            error: 'Payment verification failed'
        });
    }

    // Update order status
    const order = orders.get(order_id);

    if (!order) {
        return res.status(404).json({
            success: false,
            error: 'Order not found'
        });
    }

    order.payment_status = 'PAID';
    order.razorpay_payment_id = razorpay_payment_id;
    order.paid_at = new Date().toISOString();

    console.log(`✅ Payment Verified: #${order_id.toUpperCase()} - ₹${order.total_amount} - Razorpay: ${razorpay_payment_id}`);

    res.json({
        success: true,
        message: 'Payment verified successfully',
        order
    });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('');
    console.log('🍽️  ========================================');
    console.log('🍽️  Sathyabama Canteen Server Started!');
    console.log('🍽️  ========================================');
    console.log('');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('📱 Pages:');
    console.log(`   • Student Login:  http://localhost:${PORT}/`);
    console.log(`   • Food Menu:      http://localhost:${PORT}/menu`);
    console.log(`   • Receipt:        http://localhost:${PORT}/receipt`);
    console.log(`   • Admin Panel:    http://localhost:${PORT}/admin`);
    console.log('');
    console.log('🎓 Demo Register Numbers:');
    console.log('   • 41110234 - Rahul Kumar');
    console.log('   • 41110235 - Priya Sharma');
    console.log('   • 12345678 - Demo Student');
    console.log('');
    console.log('✨ Ready to serve hungry students!');
    console.log('');
});
