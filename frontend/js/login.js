// ============================================
// Login Page - login.js
// Handles both Login and Forgot Password flows
// via dynamic DOM manipulation (no separate page)
// ============================================

// Check if already logged in
const storedRegNo = localStorage.getItem('registerNumber');
const storedName = localStorage.getItem('studentName');
if (storedRegNo && storedName) {
    window.location.href = '/select-canteen';
}

// ── References ─────────────────────────────
const loginCard = document.querySelector('.login-card');
const cardHeader = loginCard.querySelector('.card-header');
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const errorText = errorMessage.querySelector('.error-text');
const forgotLink = document.getElementById('forgotPasswordLink');

// ── Login Form Handler ─────────────────────
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const registerNumber = document.getElementById('registerNumber').value.trim().toUpperCase();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('loginBtn');

    errorMessage.classList.remove('show');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-text">Logging in...</span><span class="btn-loader"></span>';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registerNumber, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('registerNumber', data.registerNumber);
            localStorage.setItem('studentName', data.name);
            window.location.href = '/select-canteen';
        } else {
            errorText.textContent = data.message || "Login During You're Lunch Time";
            errorMessage.classList.add('show');
            errorMessage.classList.add('shake');
            setTimeout(() => errorMessage.classList.remove('shake'), 500);

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Login</span><span class="btn-icon">→</span>';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorText.textContent = 'Connection failed. Please try again.';
        errorMessage.classList.add('show');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Login</span><span class="btn-icon">→</span>';
    }
});

// Clear error on input
document.getElementById('registerNumber').addEventListener('input', () => {
    errorMessage.classList.remove('show');
});
document.getElementById('password').addEventListener('input', () => {
    errorMessage.classList.remove('show');
});

// ============================================
// Forgot Password — Dynamic Form Swap via JS
// ============================================

forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    showForgotPasswordForm();
});

function showForgotPasswordForm() {
    // Update card header
    cardHeader.innerHTML = `
        <h2>Reset Password</h2>
        <p>Enter your Register Number and set a new password</p>
    `;

    // Hide login form, build forgot form
    loginForm.style.display = 'none';
    forgotLink.parentElement.style.display = 'none';

    // Remove old forgot form if exists
    const existing = document.getElementById('forgotForm');
    if (existing) existing.remove();

    // Build forgot password form
    const forgotForm = document.createElement('form');
    forgotForm.id = 'forgotForm';
    forgotForm.className = 'login-form';
    forgotForm.innerHTML = `
        <div class="input-group">
            <label for="forgotRegNo">Register Number</label>
            <div class="input-wrapper">
                <span class="input-icon">🎓</span>
                <input type="text" id="forgotRegNo" name="forgotRegNo" placeholder="e.g., 43613001"
                    required autocomplete="off" minlength="5">
            </div>
        </div>

        <div class="input-group">
            <label for="newPassword">New Password</label>
            <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input type="password" id="newPassword" name="newPassword" placeholder="Enter new password"
                    required minlength="4">
            </div>
            <span style="font-size: 0.75rem; color: var(--gray-400); margin-top: 4px; display:block;">Minimum 4 characters</span>
        </div>

        <div class="input-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input type="password" id="confirmPassword" name="confirmPassword"
                    placeholder="Confirm new password" required minlength="4">
            </div>
        </div>

        <!-- Error Message -->
        <div class="error-message" id="forgotErrorMessage">
            <span class="error-icon">⚠️</span>
            <span class="error-text">Something went wrong</span>
        </div>

        <!-- Success Message -->
        <div class="success-message" id="forgotSuccessMessage">
            <span class="success-icon">✅</span>
            <span class="success-text">Password updated successfully!</span>
        </div>

        <button type="submit" class="btn-primary btn-large" id="resetBtn">
            <span class="btn-text">Reset Password</span>
            <span class="btn-icon">🔑</span>
        </button>
    `;

    // Insert forgot form after card header
    loginCard.insertBefore(forgotForm, loginCard.querySelector('.error-message') || loginCard.children[1]);

    // Back to login link
    const backLink = document.createElement('div');
    backLink.id = 'backToLoginWrap';
    backLink.style.cssText = 'text-align:center; margin-top: var(--space-md);';
    backLink.innerHTML = `
        <a href="#" id="backToLoginLink"
           style="color: rgba(255,255,255,0.8); text-decoration: none; font-size: 0.875rem; font-weight: 500;
                  display: inline-flex; align-items: center; gap: 4px;">
            ← Back to Login
        </a>
    `;
    loginCard.parentElement.insertBefore(backLink, loginCard.nextSibling);

    // ── Attach forgot form handlers ───────────
    forgotForm.addEventListener('submit', handleForgotSubmit);

    // Clear errors on input
    forgotForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            document.getElementById('forgotErrorMessage').classList.remove('show');
        });
    });

    // Back to login handler
    document.getElementById('backToLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Focus first field
    document.getElementById('forgotRegNo').focus();
}

async function handleForgotSubmit(e) {
    e.preventDefault();

    const regNo = document.getElementById('forgotRegNo').value.trim().toUpperCase();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const forgotError = document.getElementById('forgotErrorMessage');
    const forgotErrorText = forgotError.querySelector('.error-text');
    const forgotSuccess = document.getElementById('forgotSuccessMessage');
    const forgotSuccessText = forgotSuccess.querySelector('.success-text');
    const submitBtn = document.getElementById('resetBtn');

    // Hide previous messages
    forgotError.classList.remove('show');
    forgotSuccess.classList.remove('show');

    // Client-side validation
    if (!regNo || !newPassword || !confirmPassword) {
        forgotErrorText.textContent = 'All fields are required';
        forgotError.classList.add('show');
        return;
    }

    if (newPassword.length < 4) {
        forgotErrorText.textContent = 'Password must be at least 4 characters';
        forgotError.classList.add('show');
        return;
    }

    if (newPassword !== confirmPassword) {
        forgotErrorText.textContent = 'Passwords do not match';
        forgotError.classList.add('show');
        forgotError.classList.add('shake');
        setTimeout(() => forgotError.classList.remove('shake'), 500);
        return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-text">Resetting...</span><span class="btn-loader"></span>';

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ regNo, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            forgotSuccessText.textContent = data.message || 'Password updated successfully!';
            forgotSuccess.classList.add('show');

            // Clear form
            document.getElementById('forgotForm').reset();

            // Return to login after 2 seconds
            setTimeout(() => {
                showLoginForm();
            }, 2000);
        } else {
            forgotErrorText.textContent = data.message || 'Something went wrong';
            forgotError.classList.add('show');
            forgotError.classList.add('shake');
            setTimeout(() => forgotError.classList.remove('shake'), 500);

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Reset Password</span><span class="btn-icon">🔑</span>';
        }
    } catch (error) {
        console.error('Reset error:', error);
        forgotErrorText.textContent = 'Connection failed. Please try again.';
        forgotError.classList.add('show');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Reset Password</span><span class="btn-icon">🔑</span>';
    }
}

function showLoginForm() {
    // Restore header
    cardHeader.innerHTML = `
        <h2>Student Login</h2>
        <p>Enter your Register Number to continue</p>
    `;

    // Remove forgot form & back link
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) forgotForm.remove();
    const backWrap = document.getElementById('backToLoginWrap');
    if (backWrap) backWrap.remove();

    // Show login form & forgot link
    loginForm.style.display = '';
    loginForm.reset();
    forgotLink.parentElement.style.display = '';
    errorMessage.classList.remove('show');

    // Focus register number
    document.getElementById('registerNumber').focus();
}
