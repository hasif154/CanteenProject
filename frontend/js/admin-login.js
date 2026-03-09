// ============================================
// Admin Login Page - admin-login.js
// ============================================

// Load canteen list
async function loadCanteens() {
    try {
        const response = await fetch('/api/canteens');
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('canteenSelect');
            select.innerHTML = '<option value="" disabled selected>Choose a canteen...</option>';
            data.canteens.forEach(canteen => {
                const option = document.createElement('option');
                option.value = canteen.id;
                option.textContent = canteen.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load canteens:', error);
    }
}

// Check if already logged in
const storedToken = localStorage.getItem('adminToken');
const storedCanteen = localStorage.getItem('adminCanteenId');
if (storedToken && storedCanteen) {
    // Verify session is still valid
    fetch('/api/admin/check-session', {
        headers: { 'X-Admin-Token': storedToken }
    }).then(r => r.json()).then(data => {
        if (data.success) {
            window.location.href = '/admin?canteen=' + storedCanteen;
        } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminCanteenId');
            localStorage.removeItem('adminCanteenName');
        }
    }).catch(() => { });
}

loadCanteens();

// Form submission
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const canteenId = document.getElementById('canteenSelect').value;
    const errorMessage = document.getElementById('errorMessage');
    const errorText = errorMessage.querySelector('.error-text');
    const submitBtn = document.getElementById('loginBtn');

    errorMessage.classList.remove('show');
    document.getElementById('rateLimitMsg').classList.remove('show');

    if (!canteenId) {
        errorText.textContent = 'Please select a canteen';
        errorMessage.classList.add('show');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-text">Authenticating...</span><span class="btn-loader"></span>';

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, canteenId })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminCanteenId', data.canteenId);
            localStorage.setItem('adminCanteenName', data.canteenName);
            window.location.href = '/admin?canteen=' + data.canteenId;
        } else {
            errorText.textContent = data.message || 'Invalid credentials';
            errorMessage.classList.add('show');
            errorMessage.classList.add('shake');
            setTimeout(() => errorMessage.classList.remove('shake'), 500);

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Login to Dashboard</span><span class="btn-icon">→</span>';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorText.textContent = 'Connection failed. Please try again.';
        errorMessage.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Login to Dashboard</span><span class="btn-icon">→</span>';
    }
});
