const express = require('express');
const bcrypt = require('bcrypt');
const supabase = require('../../supabaseClient');
const store = require('../store');
const { requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// ============================================
// Student Login
// ============================================
router.post('/login', async (req, res) => {
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
            console.log(`❌ Login Failed: Student "${registerNumber}" not found in Supabase. Error: ${error?.message || 'No record'}`);
            return res.status(401).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        const passwordMatch = await bcrypt.compare(password, student.password_hash);
        if (!passwordMatch) {
            console.log(`❌ Login Failed: Wrong password for "${registerNumber}"`);
            return res.status(401).json({
                success: false,
                message: "Canteen can be accessed during your lunch break"
            });
        }

        if (student.canteen_access !== true) {
            console.log(`❌ Login Failed: Access denied for "${registerNumber}" (canteen_access=${student.canteen_access})`);
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
        console.error('❌ Login Error (exception):', err.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// ============================================
// Admin Authentication
// ============================================
router.post('/admin/login', async (req, res) => {
    const { username, password, canteenId } = req.body;

    if (!username || !password || !canteenId) {
        return res.status(400).json({
            success: false,
            message: 'Username, password, and canteen selection are required'
        });
    }

    try {
        const { data: adminUser, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !adminUser) {
            console.log(`❌ Admin Login Failed: User "${username}" not found`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
        if (!passwordMatch) {
            console.log(`❌ Admin Login Failed: Wrong password for "${username}"`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (err) {
        console.error('❌ Admin Login Error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }

    if (!store.canteenMenus[canteenId]) {
        return res.status(400).json({
            success: false,
            message: 'Invalid canteen selected'
        });
    }

    const existingToken = store.canteenActiveAdmin.get(canteenId);
    if (existingToken && store.adminSessions.has(existingToken)) {
        console.log(`⚠️ Another admin already logged in to ${canteenId}. Replacing session.`);
    }

    const token = store.createAdminSession(canteenId);
    const canteen = store.canteenMenus[canteenId];

    res.json({
        success: true,
        token,
        canteenId,
        canteenName: canteen.name,
        message: `Logged in to ${canteen.name} admin panel`
    });
});

router.post('/admin/logout', requireAdmin, (req, res) => {
    store.destroyAdminSession(req.adminToken);
    res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/admin/check-session', requireAdmin, (req, res) => {
    const canteen = store.canteenMenus[req.adminSession.canteenId];
    res.json({
        success: true,
        canteenId: req.adminSession.canteenId,
        canteenName: canteen ? canteen.name : 'Unknown',
        loginTime: req.adminSession.loginTime
    });
});

module.exports = router;
