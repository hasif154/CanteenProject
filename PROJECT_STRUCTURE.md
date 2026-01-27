# Project Structure
## Directory & File Overview

```text
Sathyabama Canteen/
├── backend-node/               # Backend Server Logic
│   ├── .env                    # Environment variables (Razorpay Keys)
│   ├── package.json            # Backend dependencies (Express, CORS, Razorpay)
│   └── server.js               # **Main Server File**: Contains all API routes and logic
│
├── frontend/                   # Frontend UI (Served by Backend)
│   ├── static/                 # Served as public assets
│   │   ├── styles.css          # Main styling for all pages
│   │   └── campus-bg.png       # Background image
│   │
│   ├── index.html              # **Login Page**: Student entry point
│   ├── menu.html               # **Ordering Page**: Menu, Cart, Checkout
│   ├── receipt.html            # **Receipt Page**: Order summary & QR Code
│   └── admin.html              # **Admin Dashboard**: Order list & QR Scanner
│
└── README.md                   # Project documentation
```

### Key Responsibilities

| File | Type | Responsibility |
|------|------|----------------|
| `server.js` | Backend | Handles API requests, stores orders in memory, validates payments. |
| `index.html` | Frontend | Authenticates students using Reg No logic. |
| `menu.html` | Frontend | Displays food, manages complex cart logic, handles Razorpay checkout. |
| `receipt.html` | Frontend | Displays final order status and generates the pickup QR code. |
| `admin.html` | Frontend | Dashboard for staff to view orders and scan student QR codes. |
| `styles.css` | Styles | Contains the "Sathyabama Blue" theme, glassmorphism effects, and animations. |
