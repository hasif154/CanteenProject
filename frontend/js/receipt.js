// ============================================
// Receipt Page - receipt.js
// ============================================

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const registerNumber = localStorage.getItem('registerNumber');
    const studentName = localStorage.getItem('studentName');

    if (!registerNumber || !studentName) {
        alert('Session expired. Please login again.');
        window.location.href = '/';
        return;
    }

    // Get order ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    let orderId = urlParams.get('order_id') || localStorage.getItem('lastOrderId');
    const canteenId = localStorage.getItem('lastCanteenId');
    const canteenName = localStorage.getItem('lastCanteenName');

    // Try to get order from localStorage first
    const storedOrder = localStorage.getItem('lastOrder');

    if (storedOrder) {
        const order = JSON.parse(storedOrder);
        renderReceipt(order, registerNumber, studentName, canteenName);
    } else if (orderId) {
        await fetchOrderDetails(orderId, registerNumber, studentName, canteenName);
    } else {
        alert('No order found. Redirecting to menu...');
        window.location.href = '/select-canteen';
        return;
    }

    setupEventListeners(canteenId);
});

// ============================================
// API Functions
// ============================================
async function fetchOrderDetails(orderId, registerNumber, studentName, canteenName) {
    try {
        const response = await fetch(`/api/order/${orderId}`);
        const data = await response.json();

        if (data.success) {
            renderReceipt(data.order, registerNumber, studentName, canteenName);
        } else {
            alert('Failed to load order details');
            window.location.href = '/select-canteen';
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        const storedOrder = localStorage.getItem('lastOrder');
        if (storedOrder) {
            renderReceipt(JSON.parse(storedOrder), registerNumber, studentName, canteenName);
        } else {
            alert('Connection error. Please try again.');
        }
    }
}

// ============================================
// Rendering
// ============================================
function renderReceipt(order, registerNumber, studentName, canteenName) {
    // Canteen name
    const displayCanteenName = canteenName || order.canteen_name || 'Sathyabama Canteen';
    document.getElementById('receiptCanteenName').textContent = '🍽️ ' + displayCanteenName;
    document.getElementById('canteenDisplay').textContent = displayCanteenName;

    // Order ID
    document.getElementById('orderIdDisplay').textContent = '#' + order.id.toUpperCase();

    // Student Info
    document.getElementById('registerNumberDisplay').textContent = registerNumber;
    document.getElementById('studentNameDisplay').textContent = studentName;

    // Timestamp
    const date = new Date(order.created_at);
    document.getElementById('timestampDisplay').textContent = formatDateTime(date);

    // Items
    const itemsList = document.getElementById('itemsList');
    itemsList.innerHTML = order.items.map(item => `
        <div class="receipt-item">
            <div class="receipt-item-info">
                <span class="receipt-item-qty">${item.quantity}×</span>
                <span class="receipt-item-name">${item.emoji} ${item.name}</span>
            </div>
            <span class="receipt-item-price">₹${item.price * item.quantity}</span>
        </div>
    `).join('');

    // Total
    document.getElementById('totalAmount').textContent = order.total_amount;

    // Generate QR Code
    generateQRCode(order.id, registerNumber, studentName, order.total_amount);
}

function formatDateTime(date) {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
}

function generateQRCode(orderId, registerNumber, studentName, total) {
    const qrContainer = document.getElementById('qrCode');
    qrContainer.innerHTML = '';

    const qrContent = `SATHYABAMA-CANTEEN|Order:${orderId.toUpperCase()}|Reg:${registerNumber}|Name:${studentName}|Total:Rs.${total}`;

    try {
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: qrContent,
                width: 140,
                height: 140,
                colorDark: "#1e3a8a",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        } else {
            createQRFallback(qrContainer, orderId);
        }
    } catch (error) {
        console.error('QR Code generation error:', error);
        createQRFallback(qrContainer, orderId);
    }
}

function createQRFallback(container, orderId) {
    container.innerHTML = `
        <div style="width:140px;height:140px;background:white;border:3px solid #1e3a8a;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:15px;">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="3" height="3"/>
                <rect x="18" y="14" width="3" height="3"/>
                <rect x="14" y="18" width="3" height="3"/>
                <rect x="18" y="18" width="3" height="3"/>
            </svg>
            <div style="font-size:11px;font-weight:700;color:#1e3a8a;text-align:center;font-family:monospace;">#${orderId.toUpperCase()}</div>
        </div>
    `;
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners(canteenId) {
    // New order button - go back to same canteen
    document.getElementById('newOrderBtn').addEventListener('click', () => {
        localStorage.removeItem('lastOrderId');
        localStorage.removeItem('lastOrder');
        if (canteenId) {
            window.location.href = '/menu?canteen=' + canteenId;
        } else {
            window.location.href = '/select-canteen';
        }
    });

    // Change canteen
    document.getElementById('changeCanteenBtn').addEventListener('click', () => {
        localStorage.removeItem('lastOrderId');
        localStorage.removeItem('lastOrder');
        window.location.href = '/select-canteen';
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/';
    });
}
