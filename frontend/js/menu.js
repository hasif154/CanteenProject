// ============================================
// Menu Page - menu.js
// State Management, API, Rendering, Cart
// ============================================

let menuItems = [];
let cart = {};
let registerNumber = '';
let studentName = '';
let currentCategory = 'all';
let canteenId = '';
let canteenName = '';
let lastMenuVersion = -1;
let searchQuery = '';
let vegOnly = false;

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    registerNumber = localStorage.getItem('registerNumber');
    studentName = localStorage.getItem('studentName');

    if (!registerNumber || !studentName) {
        window.location.href = '/';
        return;
    }

    // Get canteen from URL params
    const urlParams = new URLSearchParams(window.location.search);
    canteenId = urlParams.get('canteen');

    if (!canteenId) {
        window.location.href = '/select-canteen';
        return;
    }

    // Display user info
    document.getElementById('userDisplay').textContent = `${registerNumber} – ${studentName}`;

    // Load cart from session (per canteen)
    const savedCart = localStorage.getItem('cart_' + canteenId);
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }

    // Fetch menu
    fetchMenu();

    // Set up event listeners
    setupEventListeners();

    // Live polling for menu changes every 5 seconds
    setInterval(checkMenuUpdates, 5000);
});

// ============================================
// API Functions
// ============================================
async function fetchMenu() {
    try {
        const response = await fetch(`/api/menu/${canteenId}`);
        const data = await response.json();

        if (data.success) {
            menuItems = data.menu;
            canteenName = data.canteenName;
            lastMenuVersion = data.menuVersion;

            document.getElementById('canteenTitle').textContent = canteenName;
            document.title = `Menu - ${canteenName}`;

            // Remove cart items that are no longer available
            cleanupCart();

            renderMenu();
            updateCartUI();
        } else {
            throw new Error(data.error || 'Failed to load menu');
        }
    } catch (error) {
        console.error('Error fetching menu:', error);
        document.getElementById('menuGrid').innerHTML = `
            <div class="empty-state">
                <div class="icon">😕</div>
                <h3>Failed to load menu</h3>
                <p>Please refresh the page to try again</p>
            </div>
        `;
    }
}

async function checkMenuUpdates() {
    try {
        const response = await fetch('/api/menu-version');
        const data = await response.json();

        if (data.success && data.version !== lastMenuVersion) {
            console.log('📡 Menu updated! Refreshing...');
            await fetchMenu();

            // Show update toast
            const toast = document.getElementById('menuToast');
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    } catch {
        // Silently fail - will retry on next interval
    }
}

function cleanupCart() {
    // Remove items from cart that are no longer available
    const newCart = {};
    for (const [id, qty] of Object.entries(cart)) {
        const item = menuItems.find(m => m.id === id);
        if (item && item.available) {
            newCart[id] = qty;
        }
    }
    if (Object.keys(newCart).length !== Object.keys(cart).length) {
        cart = newCart;
        saveCart();
    }
}

async function createOrder() {
    const items = Object.entries(cart).map(([id, qty]) => ({
        menu_item_id: id,
        quantity: qty
    }));

    try {
        const response = await fetch('/api/order/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: registerNumber,
                student_name: studentName,
                items: items,
                canteen_id: canteenId
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating order:', error);
        return { success: false, error: 'Connection error' };
    }
}

// ============================================
// Rendering Functions
// ============================================
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    let filteredItems = currentCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === currentCategory);

    // Apply search filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredItems = filteredItems.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        );
    }

    // Apply veg filter
    if (vegOnly) {
        filteredItems = filteredItems.filter(item => item.isVeg !== false);
    }

    if (filteredItems.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">${searchQuery ? '🔍' : '🍽️'}</div>
                <h3>${searchQuery ? 'No results found' : 'No items found'}</h3>
                <p>${searchQuery ? `No items matching "${searchQuery}"` : 'Try selecting a different category'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredItems.map(item => {
        const isAvailable = item.available !== false;
        const inCart = cart[item.id] && isAvailable;

        return `
        <div class="food-card ${inCart ? 'in-cart' : ''} ${!isAvailable ? 'sold-out' : ''}" data-id="${item.id}">
            <div class="food-image-container">
                <span class="food-veg-badge ${item.isVeg !== false ? 'veg' : 'nonveg'}"></span>
                <img 
                    class="food-image" 
                    src="${item.image || ''}" 
                    alt="${item.name}"
                    loading="lazy"
                    onerror="this.style.display='none'"
                    style="${item.image ? '' : 'display:none'}"
                >
                ${item.emoji ? `<span class="food-emoji">${item.emoji}</span>` : ''}
                ${!isAvailable ? '<div class="sold-out-overlay"><span>Sold Out</span></div>' : ''}
            </div>
            <div class="food-card-body">
                <h3 class="food-name">${item.name}</h3>
                <p class="food-price">₹${item.price}</p>
                <div class="food-actions">
                    ${!isAvailable ? `
                        <span class="unavailable-tag">❌ Not Available</span>
                    ` : inCart ? `
                        <div class="qty-controls">
                            <button class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
                            <span class="qty-value">${cart[item.id]}</span>
                            <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
                        </div>
                    ` : `
                        <button class="add-btn" data-action="add" data-id="${item.id}">+ Add</button>
                    `}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function renderCartModal() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartEntries = Object.entries(cart);

    if (cartEntries.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some delicious items!</p>
            </div>
        `;
        return;
    }

    cartItemsContainer.innerHTML = cartEntries.map(([id, qty]) => {
        const item = menuItems.find(m => m.id === id);
        if (!item) return '';

        return `
            <div class="cart-item">
                <span class="cart-item-emoji">${item.emoji}</span>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price} × ${qty}</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" data-action="decrease" data-id="${id}">−</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn" data-action="increase" data-id="${id}">+</button>
                </div>
                <span class="cart-item-total">₹${item.price * qty}</span>
            </div>
        `;
    }).join('');
}

function updateCartUI() {
    const cartEntries = Object.entries(cart);
    const totalItems = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);
    const totalAmount = cartEntries.reduce((sum, [id, qty]) => {
        const item = menuItems.find(m => m.id === id);
        return sum + (item ? item.price * qty : 0);
    }, 0);

    const floatingCart = document.getElementById('floatingCart');
    if (totalItems > 0) {
        floatingCart.classList.remove('hidden');
        document.getElementById('cartCount').textContent = totalItems;
        document.getElementById('cartTotal').textContent = totalAmount;
    } else {
        floatingCart.classList.add('hidden');
    }

    document.getElementById('modalTotal').textContent = totalAmount;

    saveCart();
    renderMenu();
    renderCartModal();
}

function saveCart() {
    localStorage.setItem('cart_' + canteenId, JSON.stringify(cart));
}

// ============================================
// Cart Functions
// ============================================
function addToCart(itemId) {
    const item = menuItems.find(m => m.id === itemId);
    if (!item || !item.available) return;
    cart[itemId] = (cart[itemId] || 0) + 1;
    updateCartUI();
}

function increaseQty(itemId) {
    if (cart[itemId]) {
        cart[itemId]++;
        updateCartUI();
    }
}

function decreaseQty(itemId) {
    if (cart[itemId]) {
        cart[itemId]--;
        if (cart[itemId] <= 0) {
            delete cart[itemId];
        }
        updateCartUI();
    }
}

// ============================================
// Order Placement
// ============================================
async function handlePlaceOrder() {
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = '<span class="btn-text">Processing...</span><span class="btn-loader"></span>';

    try {
        const orderResult = await createOrder();

        if (!orderResult.success) {
            throw new Error(orderResult.error || 'Failed to create order');
        }

        const order = orderResult.order;

        const paymentResponse = await fetch('/api/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: order.id })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentData.success) {
            throw new Error(paymentData.error || 'Failed to initiate payment');
        }

        const options = {
            key: paymentData.razorpay_key_id,
            amount: paymentData.amount,
            currency: paymentData.currency,
            name: canteenName || "Sathyabama Canteen",
            description: "Food Order #" + order.id.toUpperCase(),
            image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Samosa-Indian.jpg/1280px-Samosa-Indian.jpg",
            handler: async function (response) {
                try {
                    const verifyResponse = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: order.id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyResponse.json();

                    if (verifyData.success) {
                        cart = {};
                        localStorage.removeItem('cart_' + canteenId);
                        localStorage.setItem('lastOrderId', order.id);
                        localStorage.setItem('lastOrder', JSON.stringify(verifyData.order));
                        localStorage.setItem('lastCanteenId', canteenId);
                        localStorage.setItem('lastCanteenName', canteenName);
                        window.location.href = '/receipt?order_id=' + order.id;
                    } else {
                        alert('Payment verification failed: ' + verifyData.error);
                    }
                } catch (err) {
                    console.error('Verification error:', err);
                    alert('Payment verification failed. Please contact support.');
                }
            },
            prefill: paymentData.prefill,
            theme: { color: "#1e3a8a" },
            modal: {
                ondismiss: async function () {
                    // Cancel the pending order on the backend
                    try {
                        await fetch('/api/order/cancel', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ order_id: order.id })
                        });
                    } catch (err) {
                        console.error('Failed to cancel order:', err);
                    }
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.innerHTML = '<span class="btn-text">✓ Place Order</span>';
                    alert('Payment cancelled. Please try again.');
                }
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();

    } catch (error) {
        console.error('Order processing error:', error);
        alert('Error: ' + (error.message || 'An error occurred. Please try again.'));
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = '<span class="btn-text">✓ Place Order</span>';
    }
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Category tabs
    document.getElementById('categoryTabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-btn')) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            renderMenu();
        }
    });

    // Menu grid click delegation
    document.getElementById('menuGrid').addEventListener('click', (e) => {
        const target = e.target;
        if (target.dataset.action === 'add') {
            addToCart(target.dataset.id);
        } else if (target.dataset.action === 'increase') {
            increaseQty(target.dataset.id);
        } else if (target.dataset.action === 'decrease') {
            decreaseQty(target.dataset.id);
        }
    });

    // Search functionality
    const searchInput = document.getElementById('menuSearchInput');
    const searchClear = document.getElementById('searchClear');

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        searchClear.classList.toggle('hidden', !searchQuery);
        renderMenu();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.classList.add('hidden');
        renderMenu();
        searchInput.focus();
    });

    // Veg toggle
    document.getElementById('vegToggle').addEventListener('change', (e) => {
        vegOnly = e.target.checked;
        renderMenu();
    });

    // Cart modal click delegation
    document.getElementById('cartItems').addEventListener('click', (e) => {
        const target = e.target;
        if (target.dataset.action === 'increase') {
            increaseQty(target.dataset.id);
        } else if (target.dataset.action === 'decrease') {
            decreaseQty(target.dataset.id);
        }
    });

    // Open cart modal
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        renderCartModal();
        document.getElementById('cartModal').classList.add('active');
    });

    // Close cart modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('cartModal').classList.remove('active');
    });

    // Close modal on overlay click
    document.getElementById('cartModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('active');
        }
    });

    // Place Order button
    document.getElementById('placeOrderBtn').addEventListener('click', handlePlaceOrder);

    // User info click - logout option
    document.getElementById('userInfo').addEventListener('click', () => {
        if (confirm('Do you want to logout?')) {
            localStorage.removeItem('registerNumber');
            localStorage.removeItem('studentName');
            // Clear all canteen carts
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cart_')) localStorage.removeItem(key);
            });
            window.location.href = '/';
        }
    });
}
