// Dashboard Page - dashboard.js
// Order history, stats, filtering

let allOrders = [];
let currentFilter = 'all';
let registerNumber = '';
let studentName = '';

document.addEventListener('DOMContentLoaded', () => {
    registerNumber = localStorage.getItem('registerNumber');
    studentName = localStorage.getItem('studentName');
    if (!registerNumber || !studentName) { window.location.href = '/'; return; }
    document.getElementById('userDisplay').textContent = `${registerNumber} – ${studentName}`;
    fetchOrders();
    setupEventListeners();
    setInterval(fetchOrders, 15000);
});

async function fetchOrders() {
    try {
        const response = await fetch(`/api/orders/student/${registerNumber}`);
        const data = await response.json();
        if (data.success) {
            allOrders = data.orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            updateStats();
            renderOrders();
        } else { showEmptyState('Failed to load orders'); }
    } catch (error) {
        console.error('Error fetching orders:', error);
        showEmptyState('Connection error. Please refresh.');
    }
}

function updateStats() {
    const ongoing = allOrders.filter(o => isOngoing(o));
    const completed = allOrders.filter(o => isCompleted(o));
    const totalSpent = allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    animateValue('statTotalValue', allOrders.length);
    animateValue('statOngoingValue', ongoing.length);
    animateValue('statCompletedValue', completed.length);
    document.getElementById('statSpentValue').textContent = `₹${totalSpent}`;
    document.getElementById('countAll').textContent = allOrders.length;
    document.getElementById('countOngoing').textContent = ongoing.length;
    document.getElementById('countCompleted').textContent = completed.length;
}

function animateValue(elementId, finalValue) {
    const el = document.getElementById(elementId);
    const current = parseInt(el.textContent) || 0;
    if (current === finalValue) return;
    el.textContent = finalValue;
    el.classList.add('stat-pop');
    setTimeout(() => el.classList.remove('stat-pop'), 300);
}

function isOngoing(order) {
    const status = (order.order_status || '').toUpperCase();
    return status === 'PLACED' || status === 'PREPARING' || status === 'READY';
}

function isCompleted(order) {
    const status = (order.order_status || '').toUpperCase();
    return status === 'COLLECTED' || status === 'COMPLETED' || status === 'DELIVERED';
}

function getStatusInfo(status) {
    const s = (status || '').toUpperCase();
    const map = {
        'PLACED': { label: 'Order Placed', class: 'status-placed', icon: '📝' },
        'PREPARING': { label: 'Preparing', class: 'status-preparing', icon: '👨‍🍳' },
        'READY': { label: 'Ready for Pickup', class: 'status-ready', icon: '🔔' },
        'COLLECTED': { label: 'Collected', class: 'status-collected', icon: '✅' },
        'COMPLETED': { label: 'Completed', class: 'status-completed', icon: '✅' },
        'DELIVERED': { label: 'Delivered', class: 'status-completed', icon: '✅' }
    };
    return map[s] || { label: status || 'Unknown', class: 'status-placed', icon: '📋' };
}

function getPaymentInfo(order) {
    const ps = (order.payment_status || '').toUpperCase();
    if (ps === 'PAID') return { label: 'Paid', class: 'pay-paid', icon: '💳' };
    return { label: 'Pending', class: 'pay-pending', icon: '⏳' };
}

function renderOrders() {
    const container = document.getElementById('ordersList');
    let filtered = allOrders;
    if (currentFilter === 'ongoing') filtered = allOrders.filter(o => isOngoing(o));
    else if (currentFilter === 'completed') filtered = allOrders.filter(o => isCompleted(o));

    if (filtered.length === 0) {
        const messages = {
            all: { icon: '📭', title: 'No orders yet', sub: 'Place your first order to see it here!' },
            ongoing: { icon: '☕', title: 'No ongoing orders', sub: 'All your orders have been completed.' },
            completed: { icon: '🍽️', title: 'No completed orders', sub: 'Your completed orders will appear here.' }
        };
        const msg = messages[currentFilter];
        container.innerHTML = `<div class="dash-empty-state"><div class="dash-empty-icon">${msg.icon}</div><h3>${msg.title}</h3><p>${msg.sub}</p><a href="/select-canteen" class="dash-empty-btn"><span>🍽️</span> Order Now</a></div>`;
        return;
    }

    const grouped = {};
    filtered.forEach(order => {
        const date = new Date(order.created_at);
        const key = date.toDateString();
        if (!grouped[key]) grouped[key] = { date, orders: [] };
        grouped[key].orders.push(order);
    });

    let html = '';
    for (const [key, group] of Object.entries(grouped)) {
        const now = new Date();
        let dateLabel;
        if (group.date.toDateString() === now.toDateString()) dateLabel = 'Today';
        else {
            const yesterday = new Date(now.getTime() - 86400000);
            dateLabel = group.date.toDateString() === yesterday.toDateString() ? 'Yesterday' :
                group.date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
        }

        html += `<div class="dash-date-group"><div class="dash-date-header"><span class="dash-date-label">${dateLabel}</span><span class="dash-date-count">${group.orders.length} order${group.orders.length > 1 ? 's' : ''}</span></div>`;

        group.orders.forEach((order, index) => {
            const statusInfo = getStatusInfo(order.order_status);
            const paymentInfo = getPaymentInfo(order);
            const isActive = isOngoing(order);
            const time = new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const shortItems = order.items.slice(0, 3).map(i => `<span class="dash-item-chip">${i.emoji || '🍽️'} ${i.name} <span class="chip-qty">×${i.quantity}</span></span>`).join('');
            const moreCount = order.items.length > 3 ? order.items.length - 3 : 0;

            html += `<div class="dash-order-card ${isActive ? 'active-order' : 'completed-order'}" data-order-id="${order.id}" style="animation-delay: ${index * 0.05}s">
                <div class="dash-order-top"><div class="dash-order-left"><div class="dash-order-id">#${order.id.toUpperCase()}</div><div class="dash-order-time"><span class="time-icon">🕐</span><span>${time}</span></div></div><div class="dash-order-right"><span class="dash-status-badge ${statusInfo.class}"><span>${statusInfo.icon}</span><span>${statusInfo.label}</span></span></div></div>
                <div class="dash-order-middle"><div class="dash-order-canteen"><span class="canteen-icon">🏪</span><span>${order.canteen_name || 'Canteen'}</span></div><div class="dash-order-items-chips">${shortItems}${moreCount > 0 ? `<span class="dash-item-chip more">+${moreCount} more</span>` : ''}</div></div>
                <div class="dash-order-bottom"><div class="dash-order-amount">₹${order.total_amount}</div><div class="dash-order-payment ${paymentInfo.class}"><span>${paymentInfo.icon}</span><span>${paymentInfo.label}</span></div></div>
                ${isActive ? `<div class="dash-order-progress"><div class="progress-track"><div class="progress-step done"><div class="step-dot"></div><span>Placed</span></div><div class="progress-line ${order.order_status === 'PREPARING' || order.order_status === 'READY' ? 'done' : ''}"></div><div class="progress-step ${order.order_status === 'PREPARING' || order.order_status === 'READY' ? 'done' : ''}"><div class="step-dot"></div><span>Preparing</span></div><div class="progress-line ${order.order_status === 'READY' ? 'done' : ''}"></div><div class="progress-step ${order.order_status === 'READY' ? 'done' : ''}"><div class="step-dot"></div><span>Ready</span></div></div></div>` : ''}
            </div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

function showEmptyState(message) {
    document.getElementById('ordersList').innerHTML = `<div class="dash-empty-state"><div class="dash-empty-icon">😕</div><h3>${message}</h3><p>Please try again later</p></div>`;
}

function setupEventListeners() {
    document.querySelectorAll('.dash-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderOrders();
        });
    });
    document.getElementById('userInfo').addEventListener('click', () => {
        if (confirm('Do you want to logout?')) { localStorage.clear(); window.location.href = '/'; }
    });
    document.getElementById('ordersList').addEventListener('click', (e) => {
        const card = e.target.closest('.dash-order-card');
        if (card) {
            const orderId = card.dataset.orderId;
            if (orderId) {
                localStorage.setItem('lastOrderId', orderId);
                const order = allOrders.find(o => o.id === orderId);
                if (order) {
                    localStorage.setItem('lastOrder', JSON.stringify(order));
                    localStorage.setItem('lastCanteenName', order.canteen_name || '');
                    localStorage.setItem('lastCanteenId', order.canteen_id || '');
                }
                window.location.href = `/receipt?order_id=${orderId}`;
            }
        }
    });
}
