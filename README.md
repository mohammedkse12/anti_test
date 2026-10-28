# 🟢🟡⚪ FoodX — Grocery B2B Marketplace
### سوق المواد الغذائية بالجملة في الخرطوم

> Connecting factories & wholesalers with retailers across Khartoum, Omdurman & Bahri.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+**
- **PostgreSQL 15+**
- **Node.js 18+** & npm

### 1. Database Setup
```sql
-- In PostgreSQL
CREATE USER foodx WITH PASSWORD 'foodx123';
CREATE DATABASE foodx_db OWNER foodx;
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux

# Initialize database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Run the server
python run.py
```
Backend runs at: **http://localhost:5000**
API docs at: **http://localhost:5000/api/**

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
Frontend runs at: **http://localhost:3000**

---

## 📁 Project Structure

```
foodx/
├── backend/                    # Flask REST API
│   ├── app/
│   │   ├── __init__.py         # App factory
│   │   ├── config.py           # Configuration
│   │   ├── extensions.py       # Flask extensions
│   │   ├── models/             # SQLAlchemy models (9 files)
│   │   ├── schemas/            # Marshmallow validation (5 files)
│   │   ├── api/                # REST endpoints (10 blueprints)
│   │   ├── services/           # Business logic (3 services)
│   │   └── utils/              # Decorators & helpers
│   ├── requirements.txt
│   └── run.py
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/common/  # Shared UI (10 components)
│   │   ├── layouts/            # Page layouts (4 layouts)
│   │   ├── pages/              # Page components (18 pages)
│   │   ├── store/              # Redux state (3 slices)
│   │   ├── services/           # API client
│   │   └── i18n.js             # Bilingual config
│   └── public/locales/         # AR/EN translations
│
└── README.md
```

---

## 🔐 Authentication (OTP-based)

1. **Register**: Phone + details → OTP sent to phone
2. **Verify OTP**: 6-digit code (5-min expiry, max 3 attempts)
3. **Login**: Phone → OTP → JWT tokens issued
4. **Dev mode**: OTP printed to console (no SMS needed)

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Retailer** | Browse, cart, orders, wallet, order tracking |
| **Vendor** | Product management, order fulfillment, delivery, dashboard |
| **Admin** | User/vendor management, analytics, platform oversight |

---

## 💰 Payment Methods

- 💵 Cash on Delivery (الدفع عند الاستلام)
- 🏦 Bankak Mobile Banking (بنكك)
- 👛 Platform Wallet (rechargeable virtual wallet)

---

## 🌍 Bilingual Support

- **Arabic (العربية)** — Default, RTL layout
- **English** — LTR layout
- Dynamic direction switching
- All UI text translated via i18next
- Product data stored in both languages

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask + Flask-Smorest |
| Database | PostgreSQL |
| ORM | SQLAlchemy 2.0 |
| Auth | JWT + OTP verification |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Redux Toolkit |
| i18n | react-i18next |

---

## 📜 License
© 2026 FoodX. All rights reserved.
