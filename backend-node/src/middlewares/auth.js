const store = require('../store');

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }
    const session = store.validateAdminSession(token);
    if (!session) {
        return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    req.adminSession = session;
    req.adminToken = token;
    next();
}

module.exports = { requireAdmin };
