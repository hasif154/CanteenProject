const express = require('express');
const store = require('../store');
const { requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// ============================================
// API: Orders (per canteen)
// ============================================
router.post('/order/create', (req, res) => {
    const { student_id, student_name, items, canteen_id } = req.body;

    if (!student_id || !items || items.length === 0 || !canteen_id) {
        return res.status(400).json({
            success: false,
            error: 'Invalid request: student_id, canteen_id, and items are required'
        });
    }

    const canteen = store.canteenMenus[canteen_id];
    if (!canteen) {
        return res.status(400).json({ success: false, error: 'Invalid canteen' });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
        const menuItem = store.getMenuItemById(canteen_id, item.menu_item_id);
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

    const orderId = store.generateOrderId();
    const order = {
        id: orderId,
        canteen_id,
        canteen_name: canteen.name,
        student_id,
        student_name: student_name || 'Student',
        items: orderItems,
        total_amount: totalAmount,
        order_status: 'PLACED',
        payment_status: 'PENDING',
        created_at: new Date().toISOString()
    };

    store.orders.set(orderId, order);

    console.log(`📝 [${canteen.name}] New Order: #${orderId.toUpperCase()} - ${student_name} (${student_id}) - ₹${totalAmount}`);

    res.status(201).json({ success: true, order });
});

router.get('/order/:order_id', (req, res) => {
    const order = store.orders.get(req.params.order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
});

// Student: Get all orders for a specific student
router.get('/orders/student/:student_id', (req, res) => {
    const studentId = req.params.student_id.toUpperCase();
    const studentOrders = Array.from(store.orders.values())
        .filter(o => (o.student_id || '').toUpperCase() === studentId && o.payment_status === 'PAID')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, orders: studentOrders });
});

// Admin: Get orders for their canteen
router.get('/admin/orders', requireAdmin, (req, res) => {
    const canteenId = req.adminSession.canteenId;
    // Only show orders that have been paid — hide pending/unpaid orders from admin
    const ordersList = Array.from(store.orders.values()).filter(o => o.canteen_id === canteenId && o.payment_status === 'PAID');
    res.json({ success: true, orders: ordersList });
});

// Admin: Mark order as collected
router.post('/admin/order/collect', requireAdmin, (req, res) => {
    const { order_id } = req.body;
    const canteenId = req.adminSession.canteenId;

    if (!order_id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = store.orders.get(order_id.toLowerCase());
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
// API: Cancel Pending Order (payment dismissed)
// ============================================
router.post('/order/cancel', (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = store.orders.get(order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Only allow cancelling orders that haven't been paid
    if (order.payment_status === 'PAID') {
        return res.status(400).json({ success: false, error: 'Cannot cancel a paid order' });
    }

    store.orders.delete(order_id.toLowerCase());
    console.log(`❌ [${order.canteen_name}] Order Cancelled: #${order_id.toUpperCase()} - ${order.student_name} (payment dismissed)`);

    res.json({ success: true, message: 'Order cancelled successfully' });
});

module.exports = router;
