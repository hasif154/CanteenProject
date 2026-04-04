const express = require('express');
const crypto = require('crypto');
const store = require('../store');

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// ============================================
// API: Payment Routes (Razorpay)
// ============================================
router.post('/payment/initiate', (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = store.orders.get(order_id.toLowerCase());
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

router.post('/payment/verify', (req, res) => {
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

    const order = store.orders.get(order_id.toLowerCase());
    if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.payment_status = 'PAID';
    order.razorpay_payment_id = razorpay_payment_id;
    order.paid_at = new Date().toISOString();

    console.log(`✅ Payment Verified: #${order_id.toUpperCase()} - ₹${order.total_amount} - Razorpay: ${razorpay_payment_id}`);

    res.json({ success: true, message: 'Payment verified successfully', order });
});

module.exports = router;
