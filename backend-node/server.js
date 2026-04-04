/**
 * Sathyabama Canteen - Node.js Backend Server
 * Online Vending System for College Students
 * Features: Multi-canteen, Admin Auth, Menu Availability, Rate Limiting
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./src/store');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../frontend')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// Routes
// ============================================
const authRoutes = require('./src/routes/auth');
const menuRoutes = require('./src/routes/menu');
const orderRoutes = require('./src/routes/orders');
const paymentRoutes = require('./src/routes/payment');
const pageRoutes = require('./src/routes/pages');
const forgotPasswordRoute = require('./src/routes/forgotPassword');

// API Routes
app.use('/api', authRoutes);
app.use('/api', menuRoutes);
app.use('/api', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api', forgotPasswordRoute);

// Page Routes (Static frontend delivery)
app.use('/', pageRoutes);

// ============================================
// Start Server
// ============================================
async function startServer() {
    // Load menu first (async)
    await store.loadMenu();

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
        for (const [id, canteen] of Object.entries(store.canteenMenus)) {
            console.log(`   • ${canteen.name} (${id})`);
        }
        console.log('');
        console.log('🔑 Admin Credentials:  Verified via Supabase `admins` table');
        console.log('');
        console.log('✨ Ready to serve hungry students!');
        console.log('');
    });
}

startServer();
