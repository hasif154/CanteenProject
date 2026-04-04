// ============================================
// Forgot Password Page - forgot.js
// ============================================

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const regNo = document.getElementById('regNo').value.trim().toUpperCase();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    const errorText = errorMessage.querySelector('.error-text');
    const successMessage = document.getElementById('successMessage');
    const successText = successMessage.querySelector('.success-text');
    const submitBtn = document.getElementById('resetBtn');

    // Hide previous messages
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');

    // Client-side validation
    if (!regNo || !newPassword || !confirmPassword) {
        errorText.textContent = 'All fields are required';
        errorMessage.classList.add('show');
        return;
    }

    if (newPassword.length < 4) {
        errorText.textContent = 'Password must be at least 4 characters';
        errorMessage.classList.add('show');
        return;
    }

    if (newPassword !== confirmPassword) {
        errorText.textContent = 'Passwords do not match';
        errorMessage.classList.add('show');
        errorMessage.classList.add('shake');
        setTimeout(() => errorMessage.classList.remove('shake'), 500);
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
            successText.textContent = data.message || 'Password updated successfully!';
            successMessage.classList.add('show');

            // Clear form
            document.getElementById('forgotForm').reset();

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            errorText.textContent = data.message || 'Something went wrong';
            errorMessage.classList.add('show');
            errorMessage.classList.add('shake');
            setTimeout(() => errorMessage.classList.remove('shake'), 500);

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Reset Password</span><span class="btn-icon">🔑</span>';
        }
    } catch (error) {
        console.error('Reset error:', error);
        errorText.textContent = 'Connection failed. Please try again.';
        errorMessage.classList.add('show');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Reset Password</span><span class="btn-icon">🔑</span>';
    }
});

// Clear errors on input
document.querySelectorAll('#forgotForm input').forEach(input => {
    input.addEventListener('input', () => {
        document.getElementById('errorMessage').classList.remove('show');
    });
});
