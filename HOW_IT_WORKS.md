# How It Works
## Technical Workflow Explanation

### 1. The Frontend (Client-Side)
The frontend is built with vanilla HTML, CSS, and JavaScript. It communicates with the backend via REST APIs.

*   **Login (`index.html`)**:
    *   It doesn't use a traditional database user lookup.
    *   It uses a hardcoded JavaScript algorithm (`generateStudentDatabase`) to map Register Numbers (e.g., 43613001) to specific Student Names.
    *   If the number is valid, it stores the session in the browser's `localStorage` (`registerNumber`, `studentName`).

*   **Menu & Cart (`menu.html`)**:
    *   Fetches dynamic menu data from `/api/menu`.
    *   Manages the shopping cart entirely in JavaScript state.
    *   **Checkout Process**:
        1.  Calls `/api/order/create` to save the order in the backend (Status: PLACED).
        2.  Calls `/api/payment/initiate` to get Razorpay order parameters.
        3.  Opens the **Razorpay Payment Gateway** popup.
        4.  On success, calls `/api/payment/verify` to confirm payment and update backend status (Status: PAID).
        5.  Redirects to the receipt page.

*   **Receipt & QR (`receipt.html`)**:
    *   Fetches the finalized order details.
    *   Uses `qrcode.js` library to generate a QR code containing a string like: `SATHYABAMA-CANTEEN|Order:ID|...`.
    *   This QR code serves as the digital proof of payment.

*   **Admin & Scanner (`admin.html`)**:
    *   Poling: Automatically calls `/api/admin/orders` every 30 seconds to fetch new orders.
    *   **Scanner**: Uses `html5-qrcode` library to access the device camera.
    *   When it detects a QR code string starting with `SATHYABAMA-CANTEEN`, it extracts the Order ID and automatically calls `/api/admin/order/collect` to mark the order as delivered.

### 2. The Backend (Node.js Server)
The backend is a lightweight Express.js server (`server.js`).

*   **In-Memory Database**:
    *   There is no SQL or MongoDB database.
    *   All data (Orders, Menu) is stored in a JavaScript `Map()` object (`const orders = new Map();`).
    *   **Implication**: If you stop the server (`npm start`), all order history is wiped.

*   **API Routes**:
    *   `POST /api/login`: Validates user (server-side check).
    *   `GET /api/menu`: Returns the JSON list of food items.
    *   `POST /api/order/create`: Creates a new order object.
    *   `POST /api/admin/order/collect`: Updates status to 'COLLECTED'.
    *   `POST /api/payment/*`: Handles Razorpay interactions.

### 3. Payment Flow (Razorpay)
1.  **Initiation**: Backend creates a "dummy" Razorpay order ID (or real one if keys are valid) and sends keys to frontend.
2.  **Processing**: User enters card details/UPI in the Razorpay popup.
3.  **Verification**: Backend verifies the cryptographic signature returned by Razorpay to ensure the payment was authentic. Only then is the order marked 'PAID'.
