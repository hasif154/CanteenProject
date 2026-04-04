const express = require('express');
const path = require('path');

const router = express.Router();

const FRONTEND_DIR = path.join(__dirname, '../../../frontend');

router.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

router.get('/select-canteen', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'canteen-select.html'));
});

router.get('/menu', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'menu.html'));
});

router.get('/receipt', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'receipt.html'));
});

router.get('/admin-login', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'admin-login.html'));
});

router.get('/admin', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'dashboard.html'));
});

router.get('/forgot', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'forgot.html'));
});

module.exports = router;
