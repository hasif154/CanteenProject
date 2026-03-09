// Admin Panel - admin.js
// Orders, Menu Management, QR Scanner

let allOrders = [];
let menuItems = [];
let currentFilter = 'all';
let currentTab = 'orders';
let adminToken = '';
let canteenId = '';
let canteenName = '';
let html5QrcodeScanner = null;
let menuSearchQuery = '';
let selectedImageFile = null;

// === Auth ===
function getAdminAuth() {
    adminToken = localStorage.getItem('adminToken');
    canteenId = localStorage.getItem('adminCanteenId');
    canteenName = localStorage.getItem('adminCanteenName');
    if (!adminToken || !canteenId) { window.location.href = '/admin-login'; return false; }
    return true;
}

function authHeaders() {
    return { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken };
}

async function verifySession() {
    try {
        const response = await fetch('/api/admin/check-session', { headers: { 'X-Admin-Token': adminToken } });
        const data = await response.json();
        if (!data.success) {
            showToast('Session expired. Redirecting to login...', 'error');
            setTimeout(() => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminCanteenId'); localStorage.removeItem('adminCanteenName'); window.location.href = '/admin-login'; }, 1500);
            return false;
        }
        canteenName = data.canteenName;
        return true;
    } catch { return false; }
}

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    if (!getAdminAuth()) return;
    const valid = await verifySession();
    if (!valid) return;
    document.getElementById('canteenTitle').textContent = canteenName;
    document.title = `Admin - ${canteenName}`;
    fetchOrders();
    fetchMenu();
    setupEventListeners();
    setInterval(() => { if (currentTab === 'orders') fetchOrders(); if (currentTab === 'menu') fetchMenu(); }, 15000);
});

// === Toast ===
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span><span class="toast-text">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// === API ===
async function fetchOrders() {
    try {
        const response = await fetch('/api/admin/orders', { headers: { 'X-Admin-Token': adminToken } });
        const data = await response.json();
        if (data.success) { allOrders = data.orders || []; allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); updateStats(); renderOrders(); }
        else if (response.status === 401) window.location.href = '/admin-login';
    } catch (error) { console.error('Error fetching orders:', error); }
}

async function fetchMenu() {
    try {
        const response = await fetch('/api/admin/menu', { headers: { 'X-Admin-Token': adminToken } });
        const data = await response.json();
        if (data.success) { menuItems = data.menu || []; renderMenuManagement(); }
    } catch (error) { console.error('Error fetching menu:', error); }
}

async function markAsCollected(orderId) {
    try {
        const response = await fetch('/api/admin/order/collect', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ order_id: orderId }) });
        const data = await response.json();
        if (data.success) {
            const order = allOrders.find(o => o.id === orderId);
            if (order) { order.order_status = 'COLLECTED'; order.collected_at = new Date().toISOString(); }
            updateStats(); renderOrders();
            showToast(`Order #${orderId.toUpperCase()} marked as collected`);
        } else { showToast(data.error || 'Failed to mark as collected', 'error'); }
    } catch (error) { console.error('Error marking order:', error); showToast('Connection error. Please try again.', 'error'); }
}

async function toggleItemAvailability(itemId, available) {
    try {
        const response = await fetch('/api/admin/menu/toggle', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ itemId, available }) });
        const data = await response.json();
        if (data.success) { const item = menuItems.find(i => i.id === itemId); if (item) item.available = available; renderMenuManagement(); showToast(data.message); }
        else { showToast(data.error || 'Failed to update', 'error'); }
    } catch (error) { console.error('Error toggling item:', error); showToast('Connection error', 'error'); }
}

async function bulkToggle(available) {
    try {
        const response = await fetch('/api/admin/menu/bulk-toggle', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ available }) });
        const data = await response.json();
        if (data.success) { menuItems.forEach(item => item.available = available); renderMenuManagement(); showToast(data.message); }
        else { showToast(data.error || 'Failed to update', 'error'); }
    } catch (error) { showToast('Connection error', 'error'); }
}

// === Menu Item CRUD ===
function openAddItemModal() {
    document.getElementById('itemModalTitle').textContent = '➕ Add New Item';
    document.getElementById('itemSubmitBtn').textContent = '➕ Add to Menu';
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemCategory').value = '';
    document.getElementById('editItemId').value = '';
    selectedImageFile = null;
    // Reset food type to veg
    document.getElementById('foodTypeVeg').checked = true;
    // Reset image upload
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('imageUploadPlaceholder').style.display = '';
    document.getElementById('itemImage').value = '';
    document.getElementById('itemModal').classList.add('active');
}

function openEditItemModal(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('itemModalTitle').textContent = '✏️ Edit Item';
    document.getElementById('itemSubmitBtn').textContent = '💾 Save Changes';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('editItemId').value = item.id;
    selectedImageFile = null;
    // Set food type
    if (item.isVeg === false) {
        document.getElementById('foodTypeNonVeg').checked = true;
    } else {
        document.getElementById('foodTypeVeg').checked = true;
    }
    // Show existing image if any
    if (item.image) {
        document.getElementById('imagePreview').src = item.image;
        document.getElementById('imagePreviewContainer').style.display = '';
        document.getElementById('imageUploadPlaceholder').style.display = 'none';
    } else {
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('imageUploadPlaceholder').style.display = '';
    }
    document.getElementById('itemImage').value = '';
    document.getElementById('itemModal').classList.add('active');
}

function closeItemModal() { document.getElementById('itemModal').classList.remove('active'); }

async function submitItem() {
    const name = document.getElementById('itemName').value.trim();
    const price = parseInt(document.getElementById('itemPrice').value);
    const category = document.getElementById('itemCategory').value;
    const editItemId = document.getElementById('editItemId').value;
    const isVeg = document.getElementById('foodTypeVeg').checked;
    if (!name) { showToast('Please enter an item name', 'error'); return; }
    if (!price || price <= 0) { showToast('Please enter a valid price', 'error'); return; }
    if (!category) { showToast('Please select a category', 'error'); return; }
    const btn = document.getElementById('itemSubmitBtn');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    try {
        let url, method, body;
        if (editItemId) { url = '/api/admin/menu/edit'; method = 'PUT'; body = { itemId: editItemId, name, price, category, isVeg }; }
        else { url = '/api/admin/menu/add'; method = 'POST'; body = { name, price, category, isVeg }; }
        const response = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
        const data = await response.json();
        if (data.success) {
            // Upload image if one was selected
            if (selectedImageFile && data.item) {
                await uploadItemImage(data.item.id, selectedImageFile);
            }
            showToast(data.message); closeItemModal(); await fetchMenu();
        }
        else { showToast(data.error || 'Failed to save item', 'error'); }
    } catch (error) { console.error('Error saving item:', error); showToast('Connection error. Please try again.', 'error'); }
    finally { btn.disabled = false; btn.textContent = editItemId ? '💾 Save Changes' : '➕ Add to Menu'; selectedImageFile = null; }
}

async function uploadItemImage(itemId, file) {
    const formData = new FormData();
    formData.append('itemId', itemId);
    formData.append('image', file);
    try {
        const response = await fetch('/api/admin/menu/upload-image', {
            method: 'POST',
            headers: { 'X-Admin-Token': adminToken },
            body: formData
        });
        const data = await response.json();
        if (data.success) { showToast('📸 Image uploaded!'); }
        else { showToast(data.error || 'Image upload failed', 'error'); }
    } catch (error) { console.error('Image upload error:', error); showToast('Image upload failed', 'error'); }
}

async function deleteItem(itemId, itemName) {
    if (!confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`)) return;
    try {
        const response = await fetch('/api/admin/menu/delete', { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ itemId }) });
        const data = await response.json();
        if (data.success) { showToast(data.message); await fetchMenu(); }
        else { showToast(data.error || 'Failed to delete item', 'error'); }
    } catch (error) { console.error('Error deleting item:', error); showToast('Connection error. Please try again.', 'error'); }
}

// === Rendering ===
function updateStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.order_status !== 'COLLECTED');
    const collected = allOrders.filter(o => o.order_status === 'COLLECTED');
    const revenue = allOrders.reduce((sum, o) => sum + o.total_amount, 0);
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('pendingOrders').textContent = pending.length;
    document.getElementById('collectedOrders').textContent = collected.length;
    document.getElementById('totalRevenue').textContent = '₹' + revenue;
}

function renderOrders() {
    const container = document.getElementById('ordersList');
    let filteredOrders = allOrders;
    if (currentFilter === 'pending') filteredOrders = allOrders.filter(o => o.order_status !== 'COLLECTED');
    else if (currentFilter === 'collected') filteredOrders = allOrders.filter(o => o.order_status === 'COLLECTED');

    if (filteredOrders.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>No orders found</h3><p>${currentFilter === 'all' ? 'Waiting for orders...' : 'No ' + currentFilter + ' orders'}</p></div>`;
        return;
    }

    container.innerHTML = filteredOrders.map(order => `
        <div class="order-card ${order.order_status === 'COLLECTED' ? 'collected' : ''}">
            <div class="order-header"><div class="order-id-badge"><span class="id">#${order.id.toUpperCase()}</span><span class="order-status ${order.order_status === 'COLLECTED' ? 'collected' : 'paid'}">${order.order_status === 'COLLECTED' ? 'Collected' : 'Ready'}</span></div></div>
            <div class="order-body">
                <div class="order-meta">
                    <div class="meta-item"><span class="meta-label">Register Number</span><span class="meta-value">${order.student_id}</span></div>
                    <div class="meta-item"><span class="meta-label">Student Name</span><span class="meta-value">${order.student_name || '-'}</span></div>
                    <div class="meta-item"><span class="meta-label">Order Time</span><span class="meta-value">${formatTime(order.created_at)}</span></div>
                    ${order.collected_at ? `<div class="meta-item"><span class="meta-label">Collected At</span><span class="meta-value">${formatTime(order.collected_at)}</span></div>` : ''}
                </div>
                <div class="order-items-list">${order.items.map(item => `<div class="order-item-row"><span>${item.emoji}</span><span>${item.name}</span><span class="qty">×${item.quantity}</span></div>`).join('')}</div>
            </div>
            <div class="order-footer">
                <span class="order-total">₹${order.total_amount}</span>
                ${order.order_status === 'COLLECTED' ? `<span class="collected-badge"><span>✓</span><span>Collected</span></span>` : `<button class="collect-btn" data-order-id="${order.id}"><span>✓</span><span>Mark Collected</span></button>`}
            </div>
        </div>
    `).join('');
}

function renderMenuManagement() {
    const grid = document.getElementById('adminMenuGrid');
    const availableItems = menuItems.filter(i => i.available);
    const unavailableItems = menuItems.filter(i => !i.available);
    document.getElementById('availableCount').textContent = availableItems.length;
    document.getElementById('unavailableCount').textContent = unavailableItems.length;

    let displayItems = menuItems;
    // Apply search filter
    if (menuSearchQuery) {
        const q = menuSearchQuery.toLowerCase();
        displayItems = menuItems.filter(item =>
            item.name.toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q)
        );
    }

    if (displayItems.length === 0) {
        grid.innerHTML = `<div class="empty-state"><div class="icon">${menuSearchQuery ? '🔍' : '🍽️'}</div><h3>${menuSearchQuery ? 'No results' : 'No menu items'}</h3><p>${menuSearchQuery ? `No items matching "${menuSearchQuery}"` : 'Menu data not loaded'}</p></div>`;
        return;
    }

    grid.innerHTML = displayItems.map(item => `
        <div class="menu-manage-card ${item.available ? '' : 'unavailable'}" data-item-id="${item.id}">
            <div class="menu-manage-header">
                ${item.image
            ? `<img src="${item.image}" alt="${item.name}" style="width:50px;height:50px;border-radius:var(--radius-lg);object-fit:cover;flex-shrink:0;">`
            : (item.emoji ? `<span class="menu-manage-emoji">${item.emoji}</span>` : '')
        }
                <div class="menu-manage-info"><span class="menu-manage-name">${item.name} <span class="veg-badge ${item.isVeg !== false ? 'veg' : 'nonveg'}"><span class="veg-dot ${item.isVeg !== false ? 'veg' : 'nonveg'}"></span>${item.isVeg !== false ? 'VEG' : 'NON-VEG'}</span></span><span class="menu-manage-price">₹${item.price} · ${item.category || 'Uncategorized'}</span></div>
                <div class="menu-manage-actions">
                    <button class="icon-btn edit-item-btn" data-item-id="${item.id}" title="Edit">✏️</button>
                    <button class="icon-btn delete-item-btn" data-item-id="${item.id}" data-item-name="${item.name}" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="menu-manage-footer">
                <span class="availability-badge ${item.available ? 'available' : 'unavailable'}">${item.available ? '✅ Available' : '❌ Sold Out'}</span>
                <label class="toggle-switch"><input type="checkbox" ${item.available ? 'checked' : ''} data-item-id="${item.id}" class="toggle-input"><span class="toggle-slider"></span></label>
            </div>
        </div>
    `).join('');
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    if (isToday) return 'Today ' + date.toLocaleTimeString('en-IN', timeOptions);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', ...timeOptions });
}

// === QR Scanner ===
function initializeScanner() {
    document.getElementById('scannerModal').classList.add('active');
    if (!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, () => { }).catch(err => { console.error("Error starting scanner", err); showToast("Failed to start camera. Check permissions.", 'error'); });
}

async function onScanSuccess(decodedText) {
    let orderId = null;
    if (decodedText.startsWith('SATHYABAMA-CANTEEN')) { const parts = decodedText.split('|'); const orderPart = parts.find(p => p.startsWith('Order:')); if (orderPart) orderId = orderPart.split(':')[1]; }
    else if (decodedText.length < 20) orderId = decodedText;
    if (orderId) { orderId = orderId.trim().toLowerCase(); stopScanner(); if (confirm(`Order found: #${orderId.toUpperCase()}. Mark as collected?`)) await markAsCollected(orderId); }
    else showToast("Invalid QR Code format", 'error');
}

function stopScanner() {
    if (html5QrcodeScanner) html5QrcodeScanner.stop().then(() => { document.getElementById('scannerModal').classList.remove('active'); }).catch(err => console.error("Failed to stop scanner", err));
}

// === Event Listeners ===
function setupEventListeners() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active'); currentTab = tab.dataset.tab;
            document.getElementById(currentTab + 'Tab').classList.add('active');
            document.getElementById('statsSection').style.display = currentTab === 'orders' ? '' : 'none';
        });
    });
    document.getElementById('scanBtn').addEventListener('click', initializeScanner);
    document.getElementById('closeScannerModal').addEventListener('click', stopScanner);
    document.getElementById('refreshBtn').addEventListener('click', () => {
        const btn = document.getElementById('refreshBtn'); btn.disabled = true;
        const label = btn.querySelector('.btn-label'); if (label) label.textContent = 'Loading...';
        Promise.all([fetchOrders(), fetchMenu()]).finally(() => { btn.disabled = false; if (label) label.textContent = 'Refresh'; showToast('Data refreshed'); });
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to logout?')) return;
        try { await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() }); } catch { }
        localStorage.removeItem('adminToken'); localStorage.removeItem('adminCanteenId'); localStorage.removeItem('adminCanteenName');
        window.location.href = '/admin-login';
    });
    document.querySelector('.filter-tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) { document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); currentFilter = e.target.dataset.filter; renderOrders(); }
    });
    document.getElementById('ordersList').addEventListener('click', async (e) => {
        const collectBtn = e.target.closest('.collect-btn');
        if (collectBtn) { const orderId = collectBtn.dataset.orderId; collectBtn.disabled = true; collectBtn.innerHTML = '<span>⏳</span><span>Processing...</span>'; await markAsCollected(orderId); }
    });
    document.getElementById('adminMenuGrid').addEventListener('change', (e) => {
        if (e.target.classList.contains('toggle-input')) { toggleItemAvailability(e.target.dataset.itemId, e.target.checked); }
    });
    document.getElementById('bulkAvailableBtn').addEventListener('click', () => { if (confirm('Mark ALL items as available?')) bulkToggle(true); });
    document.getElementById('bulkUnavailableBtn').addEventListener('click', () => { if (confirm('Mark ALL items as unavailable?')) bulkToggle(false); });
    document.getElementById('addItemBtn').addEventListener('click', openAddItemModal);
    document.getElementById('closeItemModal').addEventListener('click', closeItemModal);
    document.getElementById('itemSubmitBtn').addEventListener('click', submitItem);
    document.getElementById('adminMenuGrid').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-item-btn');
        const deleteBtn = e.target.closest('.delete-item-btn');
        if (editBtn) openEditItemModal(editBtn.dataset.itemId);
        if (deleteBtn) deleteItem(deleteBtn.dataset.itemId, deleteBtn.dataset.itemName);
    });

    // Admin menu search
    const adminSearchInput = document.getElementById('adminMenuSearch');
    const adminSearchClear = document.getElementById('adminSearchClear');

    adminSearchInput.addEventListener('input', (e) => {
        menuSearchQuery = e.target.value.trim();
        adminSearchClear.classList.toggle('hidden', !menuSearchQuery);
        renderMenuManagement();
    });

    adminSearchClear.addEventListener('click', () => {
        adminSearchInput.value = '';
        menuSearchQuery = '';
        adminSearchClear.classList.add('hidden');
        renderMenuManagement();
        adminSearchInput.focus();
    });

    // Image upload
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('itemImage');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageUploadPlaceholder = document.getElementById('imageUploadPlaceholder');
    const removeImageBtn = document.getElementById('removeImageBtn');

    imageUploadArea.addEventListener('click', (e) => {
        if (e.target.closest('.remove-image-btn')) return;
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be under 5MB', 'error');
            imageInput.value = '';
            return;
        }
        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            imagePreview.src = ev.target.result;
            imagePreviewContainer.style.display = '';
            imageUploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedImageFile = null;
        imageInput.value = '';
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
        imageUploadPlaceholder.style.display = '';
    });
}
