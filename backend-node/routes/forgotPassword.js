// ============================================
// Forgot Password Route
// Standalone module — does NOT touch login logic
// ============================================

const express = require('express');
const bcrypt = require('bcrypt');
const supabase = require('../supabaseClient');

const router = express.Router();

const SALT_ROUNDS = 10;

/**
 * POST /api/forgot-password
 * Body: { regNo: string, newPassword: string }
 *
 * 1. Validates inputs
 * 2. Checks student exists in Supabase
 * 3. Hashes new password with bcrypt
 * 4. Updates password_hash in DB
 */
router.post('/forgot-password', async (req, res) => {
    const { regNo, newPassword } = req.body;

    // ── Input validation ───────────────────────
    if (!regNo || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Register Number and New Password are required'
        });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 4 characters long'
        });
    }

    try {
        // ── 1. Check if student exists ─────────────
        const { data: student, error: fetchError } = await supabase
            .from('students')
            .select('register_number, name')
            .eq('register_number', regNo.trim().toUpperCase())
            .single();

        if (fetchError || !student) {
            console.log(`❌ Forgot Password: Student "${regNo}" not found`);
            return res.status(404).json({
                success: false,
                message: 'Invalid Register Number'
            });
        }

        // ── 2. Hash the new password ───────────────
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // ── 3. Update password_hash in Supabase ────
        const { error: updateError } = await supabase
            .from('students')
            .update({ password_hash: hashedPassword })
            .eq('register_number', student.register_number);

        if (updateError) {
            console.error('❌ Forgot Password: DB update failed:', updateError.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to update password. Please try again.'
            });
        }

        console.log(`🔑 Password Reset: ${student.name} (${student.register_number})`);

        return res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (err) {
        console.error('❌ Forgot Password Error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
});

module.exports = router;
