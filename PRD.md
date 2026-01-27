# Product Requirements Document (PRD)
## Sathyabama Canteen - Online Vending System

### 1. Overview
The Sathyabama Canteen system is a web-based "Order & Collect" application designed to streamline food ordering for students and order management for canteen staff. It aims to reduce queues, digitize payments, and provide a seamless pickup experience using QR codes.

### 2. User Roles
*   **Student**: Uses the application to browse the menu, place orders, make payments, and receive a digital receipt/QR code.
*   **Admin (Canteen Staff)**: Uses the application to view incoming orders, track payment status, and scan student QR codes to verify and hand over food.

### 3. Functional Requirements

#### 3.1 Student Module
*   **Authentication**:
    *   Simple login using a valid Register Number (Validation: 43613001 - 43613046).
    *   Auto-generated student names based on the register number.
    *   "Login During You're Lunch Time" error message for invalid inputs.
*   **Menu Browsing**:
    *   View food items categorized by Snacks, Quick Meals, and Beverages.
    *   See item details: Name, Price, Image, and Emoji.
    *   Filter items by category.
*   **Cart Management**:
    *   Add/Remove items to cart.
    *   Adjust quantities.
    *   View real-time total price.
*   **Checkout & Payment**:
    *   Place orders via a clean checkout modal.
    *   **Razorpay Integration**: Make secure online payments.
    *   Receive visual confirmation upon successful payment.
*   **Digital Receipt**:
    *   View order details (Items, Total, Date).
    *   **QR Code Generation**: A unique QR code representing the order for verification.

#### 3.2 Admin Module
*   **Dashboard**:
    *   Real-time statistics: Total Orders, Pending Pickups, Collected Orders, Total Revenue.
*   **Order Management**:
    *   List all orders (sorted by newest).
    *   Filter orders by status: "Pending" or "Collected".
    *   View order details: Student Name, Reg No, Items, Payment Status.
*   **Order Verification**:
    *   **QR Code Scanner**: Built-in camera scanner to read student receipt QR codes.
    *   **One-Click Collection**: Mark orders as "Collected" instantly upon scanning or manual confirmation.

### 4. Technical Constraints (MVP)
*   **Storage**: In-memory data storage (RAM). Data is lost when the server restarts.
*   **Payment**: Simulated/Test mode (Razorpay Test Keys).
*   **Hosting**: Localhost for development/demo.

### 5. User Flow
1.  **Student** accesses the app -> Login -> Add items to Cart -> Pay via Razorpay -> Get QR Code.
2.  **Student** goes to the canteen counter -> Shows QR Code.
3.  **Admin** opens Admin Panel -> Clicks "Scan QR" -> Scans Student's Phone -> System marks order as "Collected" -> Food is handed over.
