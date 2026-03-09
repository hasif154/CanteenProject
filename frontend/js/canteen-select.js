// ============================================
// Canteen Select Page - canteen-select.js
// ============================================

// Check if logged in
const registerNumber = localStorage.getItem('registerNumber');
const studentName = localStorage.getItem('studentName');
if (!registerNumber || !studentName) {
    window.location.href = '/';
} else {
    document.getElementById('userDisplay').textContent = `${registerNumber} - ${studentName}`;
}

// Logout on user info click
document.getElementById('userInfo').addEventListener('click', () => {
    if (confirm('Do you want to logout?')) {
        localStorage.clear();
        window.location.href = '/';
    }
});

// Load canteens
async function loadCanteens() {
    try {
        const response = await fetch('/api/canteens');
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('canteenCards');
            const gradients = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            ];

            container.innerHTML = data.canteens.map((canteen, index) => {
                const gradient = gradients[index % gradients.length];
                return `
                    <a href="/menu?canteen=${canteen.id}" class="canteen-card" style="--card-gradient: ${gradient};">
                        <div class="canteen-card-glow"></div>
                        <div class="canteen-card-content">
                            <h2 class="canteen-card-name">${canteen.name}</h2>
                            <div class="canteen-card-action">
                                <span>Select</span>
                                <span class="arrow">&rarr;</span>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading canteens:', error);
        document.getElementById('canteenCards').innerHTML = `
            <div class="empty-state">
                <h3>Failed to load canteens</h3>
                <p>Please refresh the page</p>
            </div>
        `;
    }
}

loadCanteens();
