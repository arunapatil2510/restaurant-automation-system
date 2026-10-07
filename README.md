# 🍽️ RESTOSMART – Self-Service Restaurant Kiosk & Voice Ordering System

A next-generation **Self-Service Restaurant Ordering Kiosk** (inspired by modern KFC/McDonald's ordering terminals) with **Multilingual Voice-Based Food Ordering as the primary innovative feature**.

### 🌟 Core Highlights
- **Self-Service Kiosk Experience**: Fast & intuitive ordering screen with Dining Mode (Dine-In Table Picker vs Takeaway/Parcel).
- **Multilingual Voice-Based Food Ordering**: Natural speech ordering in **English**, **Kannada (ಕನ್ನಡ)**, and **Hindi (हिन्दी)** with extensible support for more regional languages.
- **Strict Menu Grounding & Quantity Extraction**: Automatically extracts quantities, dishes, and customizations (spice levels, Jain, etc.) strictly grounded against the active kitchen database.
- **Voice State Machine & Confirmation**: Real-time listening equalizer, confirmation prompts with Text-to-Speech (TTS) voice playback, manual quantity tweaking, and voice confirmation ("Yes, confirm").
- **Complete Touchscreen Fallback**: Seamless category navigation, popular specials grid, and custom modifier selection for customers who prefer touch.
- **End-to-End Kitchen & Admin Pipeline**: Real-time 3-stage Kitchen Display System (KDS), Admin Dashboard (Orders, Menu, Offers, Reservations), and Cart / Checkout flow.

---

## 📁 Project Structure

```
RESTOSMART/
├── backend/                         # Node.js + Express REST API Server
│   ├── config/                      # MongoDB Atlas connection handler
│   ├── models/                      # Mongoose schemas (Category, MenuItem, Order, etc.)
│   ├── controllers/                 # Route logic & request handlers
│   ├── services/                    # Voice parser & Gemini AI RAG service
│   ├── routes/                      # REST API endpoints
│   ├── middleware/                  # Error handling & admin passkey verification
│   ├── seed/                        # Database seed script and sample dataset
│   ├── server.js                    # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                        # React 18 + Vite SPA Client
│   ├── src/
│   │   ├── components/              # Modular UI components (common, menu, cart, voice, ai, kds)
│   │   ├── context/                 # CartContext, OrderContext, AuthContext
│   │   ├── pages/                   # Views (Home, Menu, Cart, Tracking, KDS, Admin, etc.)
│   │   ├── services/                # Axios API client
│   │   ├── index.css                # Global CSS design tokens
│   │   ├── App.jsx                  # Main Router
│   │   └── main.jsx                 # React root
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── .env.example
└── README.md
```

---

## 🚀 Local Setup Instructions

### 1. Backend Setup
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   npm install
   ```
2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Set your MongoDB Atlas URI, Google Gemini API Key, and Admin Passkey in `backend/.env`.
4. (Optional) Seed the database with sample menu items and FAQs:
   ```bash
   npm run seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server runs on http://localhost:5000 with health check at http://localhost:5000/api/health*

---

### 2. Frontend Setup
1. Open another terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The client runs on http://localhost:5173*
