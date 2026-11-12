# 🍽️ RESTOSMART – Self-Service Restaurant Kiosk & Natural Conversational AI Voice Ordering System

A next-generation **Self-Service Restaurant Ordering Kiosk** (inspired by modern intelligent terminal systems like McDonald's & KFC) featuring **Natural Multilingual Conversational Voice Ordering** as its primary innovation.

RESTOSMART allows customers to speak naturally with an AI restaurant waiter in **English**, **Kannada (ಕನ್ನಡ)**, **Hindi (हिन्दी)**, and code-switched / romanized Indian dialects (**Kanglish** and **Hinglish**). Customers can ask questions, request dietary recommendations, modify quantities, remove items, and change their mind just like conversing with an experienced human waiter.

---

## 📌 Table of Contents
1. [Problem Statement & Objectives](#-problem-statement--objectives)
2. [Key Innovations & Features](#-key-innovations--features)
3. [Multilingual Voice AI Architecture](#-multilingual-voice-ai-architecture)
4. [Language & Dialect Support](#-language--dialect-support)
5. [Customer Guidance System ("What Can I Ask?")](#-customer-guidance-system-what-can-i-ask)
6. [Technology Stack](#-technology-stack)
7. [System Architecture](#-system-architecture)
8. [Installation & Setup](#-installation--setup)
9. [Environment Variables](#-environment-variables)
10. [Running the Application](#-running-the-application)
11. [Automated Verification & Testing](#-automated-verification--testing)
12. [Current System Limitations & Realities](#-current-system-limitations--realities)

---

## 🎯 Problem Statement & Objectives

### The Problem
Traditional self-service restaurant kiosks rely exclusively on multi-layered touch menus. For many customers—especially elderly individuals, non-native English speakers, rural visitors, and busy diners—navigating deep category trees and complex touchscreens is intimidating and slow.
Earlier voice-ordering prototypes typically suffered from:
- Rigid keyword matching (breaking when natural phrasing differed slightly).
- Transliteration failure (failing when Indian speech was recognized in Latin characters).
- Hallucinations (ordering items not served by the kitchen).
- Zero conversational memory (forgetting previously discussed dishes or quantities).

### Objectives
- Deliver an intelligent voice-first ordering experience grounded strictly against the restaurant's active database.
- Understand varied expressions of the same intent without requiring fixed command syntax.
- Support native Unicode Indian scripts and romanized code-switching (Kanglish and Hinglish).
- Provide multi-turn session context to handle relative adjustments (*"give me one more"*, *"remove the last item"*, *"I changed my mind"*).
- Ensure 100% resilient fallback operation when network or AI quotas are constrained.

---

## ✨ Key Innovations & Features

### 1. Natural Multilingual Voice Ordering
- **Continuous Multi-Turn Dialogue**: Maintains conversation context, draft orders, quantities, and pronoun resolution (*"is it spicy?"* resolves to the dish in question).
- **Relative Cart Modifications**:
  - Increment: *"Give me one more"*, *"ಇನ್ನೊಂದು ಕೊಡಿ"*, *"एक और दो"*
  - Removal: *"Remove the last item"*, *"ಕೊನೆಯ ಐಟಂ ತೆಗೆದುಹಾಕಿ"*, *"आखिरी आइटम हटाओ"*
  - Re-ordering / Mind Change: *"I changed my mind, give me something mild instead"*
- **Ambiguity Clarification**: If a customer says *"make that three"* with multiple items in the draft, the AI politely asks which dish they wish to modify rather than making unsafe assumptions.

### 2. Strict Menu Grounding & Anti-Hallucination
- Disallows ordering off-menu dishes (e.g. asking for *"Pizza and Burger"* at a South Indian restaurant).
- Returns 0 verified items for unavailable dishes, explains unavailability politely, and suggests chef specials from the active MongoDB database.

### 3. Customer Guidance Panel ("What can I ask?")
- Collapsible interactive accordion across 7 categories:
  1. *Recommendations*
  2. *Menu & Options*
  3. *Dietary & Vegetarian*
  4. *Spice Level*
  5. *Price & Cost*
  6. *Ordering & Modifying*
  7. *Restaurant Info*
- Clickable localized prompt chips in English, Kannada, and Hindi that route directly into the live voice processing engine.

### 4. End-to-End Restaurant Management Suite
- **Dine-In & Takeaway Modes**: Table picker and parcel checkout.
- **Real-Time Kitchen Display System (KDS)**: 3-stage order pipeline (New, Preparing, Ready).
- **Admin Dashboard**: Real-time sales analytics, menu inventory toggles, and passkey security.
- **Cart & Touchscreen Fallback**: Complete touch UI for customers who prefer manual browsing.

---

## 🧠 Multilingual Voice AI Architecture

```
[ Microphone Input / Audio Capture ]
                │
                ▼
[ Web Speech API / Sarvam STT ]
   (BCP-47: en-IN, kn-IN, hi-IN)
                │
                ▼
[ Spoken Language & Script Detector ]
   (Native Unicode & Kanglish/Hinglish token scoring)
                │
                ▼
[ Conversational Intent & Grounding Engine ]
   ├── Primary: Backend Google Gemini 2.5 Flash / 3.8 Flash
   │   (Ground truth prompt with active MongoDB dishes & KnowledgeDocs)
   └── Resilient Fallback: Client-Side Grounded NLU
       (Fuzzy token matcher, Levenshtein similarity, phrase segmenter)
                │
                ▼
[ Cart State Machine & Pronoun Context ]
   (Tracks currentOrder, conversationHistory, lastDiscussedDish)
                │
                ▼
[ Multilingual Text-to-Speech (TTS) ]
   (Sarvam Bulbul AI / Browser Indian English & Regional Voices)
```

---

## 🌐 Language & Dialect Support

| Language | Script / Mode | Example Phrasing | Supported Feature |
| :--- | :--- | :--- | :--- |
| **English (en-IN)** | Standard English | *"I want two Masala Dosas and one Coffee"* | Direct multi-item ordering |
| **Kannada (kn-IN)** | Native Script (ಕನ್ನಡ) | *"ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ"* | Native script ordering |
| **Kanglish** | Romanized Kannada | *"ondu masala dosa kodi, swalpa khara kammi enide"* | Transliterated speech understanding |
| **Hindi (hi-IN)** | Native Script (हिन्दी) | *"दो बटर नान और एक दाल तड़का लगा दो"* | Native script ordering |
| **Hinglish** | Romanized Hindi | *"bhaiya do masala dosa dena, thoda kam teekha"* | Colloquial honorifics & suffixes |

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 (Vite SPA)
- **Styling**: Modern CSS3 Design Tokens, Glassmorphism, CSS Grid & Flexbox
- **Icons**: Lucide React
- **Routing**: React Router DOM (v6)
- **State Management**: React Context API (`CartContext`, `OrderContext`, `AuthContext`)
- **Speech APIs**: Web Speech API (`SpeechRecognition`, `SpeechSynthesis`), Sarvam AI client proxy

### Backend
- **Runtime**: Node.js & Express.js REST API
- **Database**: MongoDB Atlas with Mongoose ODM
- **AI / NLU Models**:
  - Google Gemini API (`@google/genai` SDK)
  - Configurable models: `gemini-2.5-flash`, `gemini-3.8-flash`
- **Speech Services**: Sarvam AI API (`saaras:v1` STT, `bulbul:v1` TTS)
- **Security**: CORS headers, environment variable isolation, admin passkey middleware

---

## 📁 Repository Structure

```
RESTOSMART/
├── backend/                         # Node.js Express REST API
│   ├── config/                      # MongoDB connection handler
│   ├── models/                      # Mongoose schemas (MenuItem, Order, KnowledgeDoc)
│   ├── routes/                      # API endpoints (voiceRoutes.js, orderRoutes.js)
│   ├── scripts/                     # Automated test suites & verification scripts
│   │   ├── verifyVoiceOrdering.js
│   │   ├── testConversationalVoiceAI.js
│   │   └── testMultilingualNaturalAI.js
│   ├── server.js                    # Express app root
│   └── package.json
│
├── frontend/                        # React + Vite client
│   ├── src/
│   │   ├── components/
│   │   │   └── voice/               # KioskVoiceSection, VoiceOrderModal, VoiceGuidancePanel
│   │   ├── services/                # voiceIntentService.js, sarvamVoiceService.js
│   │   ├── utils/                   # languageDetector.js, voiceParser.js, intentClassifier.js
│   │   ├── context/                 # CartContext.jsx, OrderContext.jsx
│   │   ├── pages/                   # Kiosk, Menu, Cart, KDS, Admin
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore                       # Strict exclusion for secrets, node_modules & builds
├── .env.example                     # Environment template without secrets
└── README.md                        # Documentation
```

---

## ⚙️ Environment Variables

> [!IMPORTANT]
> Never commit actual API keys or secrets to version control. Set these in your local `.env` files.

### Backend (`backend/.env`)
- `PORT`: Server port (e.g. `5000`)
- `NODE_ENV`: Runtime environment (`development` / `production`)
- `MONGODB_URI`: MongoDB Atlas connection string
- `GEMINI_API_KEY`: Google AI Studio API key
- `GEMINI_MODEL`: Gemini model identifier (e.g. `gemini-2.5-flash`)
- `SARVAM_API_KEY`: Sarvam AI API key (optional for Indian neural TTS/STT)
- `ADMIN_SECRET_KEY`: Passkey for admin dashboard access
- `CLIENT_URL`: Frontend origin URL for CORS (e.g. `http://localhost:5173`)

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`: Backend API base URL (e.g. `http://localhost:5000/api`)

---

## 🚀 Running the Application

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000` with health check at `http://localhost:5000/api/health`.*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🧪 Automated Verification & Testing

RESTOSMART includes a comprehensive three-tier test suite covering 146 automated assertions:

### 1. Core Voice Ordering & Grammar Verification
Tests single-item, multi-item, confirmation, cancellation, and anti-hallucination.
```bash
node backend/scripts/verifyVoiceOrdering.js
```
*Result: 39 passed, 0 failed.*

### 2. 16-Scenario Conversational AI Suite
Tests natural greetings, price queries, ingredient queries, multi-turn order additions, ambiguity clarification, and pronoun resolution.
```bash
node backend/scripts/testConversationalVoiceAI.js
```
*Result: 62 passed, 0 failed.*

### 3. Multilingual & Dialect Verification Suite
Tests Kannada (native and Kanglish), Hindi (native and Hinglish), English variations, low-spice queries, vegetarian queries, relative increment, and relative item removal.
```bash
node backend/scripts/testMultilingualNaturalAI.js
```
*Result: 45 passed, 0 failed.*

### 4. Production Frontend Build Verification
```bash
npm --prefix frontend run build
```
*Result: Vite build completes in ~5s with 0 errors.*

---

## 🔍 Current System Limitations & Realities

1. **Microphone Hardware Verification in CI/Sandbox**:
   Automated terminal and CI test runners lack physical audio capture devices (microphones) and cannot speak acoustic waves into the browser. Testing in those environments evaluates the complete software parsing and state pipeline using authentic speech transcripts.
2. **Browser Native TTS Voice Packs**:
   Standard desktop installations of Windows/Linux often lack native offline `kn-IN` voice packs unless manually installed via Windows Speech Settings. When a regional voice pack is missing, browser speech synthesis gracefully routes audio to an Indian English (`en-IN`) voice to prevent distortion. When Sarvam AI backend keys are configured, high-definition neural cloud audio (`bulbul:v1`) is used instead.
3. **External Gemini API Quota**:
   When internet access is unavailable or API rate limits (503/429) are encountered, RESTOSMART automatically and seamlessly transitions to its client-side grounded conversational engine without degrading user experience.
