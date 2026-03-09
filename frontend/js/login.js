// ============================================
// Login Page - login.js
// ============================================

// Check if already logged in
const storedRegNo = localStorage.getItem('registerNumber');
const storedName = localStorage.getItem('studentName');
if (storedRegNo && storedName) {
    window.location.href = '/select-canteen';
}

// Form submission handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const registerNumber = document.getElementById('registerNumber').value.trim().toUpperCase();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const errorText = errorMessage.querySelector('.error-text');
    const submitBtn = document.getElementById('loginBtn');

    // Hide any previous error
    errorMessage.classList.remove('show');

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-text">Logging in...</span><span class="btn-loader"></span>';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                registerNumber: registerNumber,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store in localStorage
            localStorage.setItem('registerNumber', data.registerNumber);
            localStorage.setItem('studentName', data.name);

            // Redirect to canteen selection
            window.location.href = '/select-canteen';
        } else {
            // Show error from backend
            errorText.textContent = data.message || "Login During You're Lunch Time";
            errorMessage.classList.add('show');

            // Shake animation
            errorMessage.classList.add('shake');
            setTimeout(() => errorMessage.classList.remove('shake'), 500);

            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Login</span><span class="btn-icon">→</span>';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorText.textContent = "Connection failed. Please try again.";
        errorMessage.classList.add('show');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Login</span><span class="btn-icon">→</span>';
    }
});

// Clear error on input
document.getElementById('registerNumber').addEventListener('input', () => {
    document.getElementById('errorMessage').classList.remove('show');
});
