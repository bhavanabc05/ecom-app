# Khanak Jewellery Store - Ecommerce Platform

A modern, fully-functional ecommerce platform for selling premium jewellery online.

## ✨ Features

- **User Authentication**: Secure signup/login system
- **Product Catalog**: Browse jewellery items with detailed product info
- **Shopping Cart**: Add/remove items from cart
- **Order Management**: Place orders and track them
- **AI Chatbot Assistant**: Streamlit-based bot powered by Groq API for product recommendations

## 🚀 Quick Start

### Prerequisites

- Node.js installed
- Python 3.8+ installed
- MongoDB running locally
- Groq API key (free tier at https://console.groq.com)

```bash
# On Windows:
mongod.exe --dbpath C:\data\db

# On Mac/Linux:
mongod
```

### Step 2: Start Backend Server

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:3000`

### Step 3: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Step 4: Start AI Chatbot (Optional)

The AI chatbot uses Streamlit and Groq API to help customers find products.

First, set up Python environment:

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

Install dependencies:

```bash
pip install streamlit groq requests python-dotenv
```

Create `.env` file in project root:

```
GROQ_API_KEY=your_groq_api_key_here
```

Run chatbot:

```bash
streamlit run chatbot.py
```

Chatbot runs on `http://localhost:8501`

### Step 5: Access the Store

Open browser and go to:

- **Store**: http://localhost:5173/
- **AI Chatbot** (optional): http://localhost:8501/

## � Tech Stack

- **Frontend**: React 18 + Vite + CSS Grid/Flexbox
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Session-based with localStorage
- **AI Bot**: Streamlit + Groq LLM API (llama-3.1-8b-instant)

## 🛍️ How to Use

1. **Sign Up**: Create account with name, email, phone, password
2. **Browse Products**: View jewellery items in the catalog
3. **Add to Cart**: Click "Add to cart" on products
4. **Checkout**: Review cart and place order
5. **Ask AI Bot**: Use `/api/products` chatbot to get product recommendations

## 📝 Project Structure

```
ecom-app/
├── frontend/
│   ├── src/
│   │   ├── App.jsx       - Main app component
│   │   ├── Auth.jsx      - Login/signup forms
│   │   └── style.css     - All styling
│   └── vite.config.js    - Vite configuration
│
├── backend/
│   ├── server.js         - Express server
│   ├── routes/
│   │   └── auth.js       - Authentication endpoints
│   ├── models/
│   │   ├── User.js       - User schema
│   │   ├── Product.js    - Product schema
│   │   └── Order.js      - Order schema
│   └── package.json      - Dependencies
│
├── chatbot.py            - Streamlit AI assistant
├── .env                  - Environment variables (Groq API key)
└── requirements.txt      - Python dependencies
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile/:userId` - Get user profile
- `PUT /api/auth/profile/:userId` - Update profile

### Products

- `GET /api/products` - Get all products

### Orders

- `POST /api/order` - Place new order
- `GET /api/orders/:userId` - Get user orders

### Admin

- `POST /api/add` - Add single product
- `POST /api/addMany` - Add multiple products
- `DELETE /api/deleteAll` - Delete all products

## 💾 Adding Sample Data

```bash
curl -X POST http://localhost:3000/api/addMany \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"Gold Ring","price":5000,"category":"Rings","description":"Beautiful gold ring","imagePath":"/img/ring.jpg"},
    {"name":"Silver Necklace","price":3000,"category":"Necklaces","description":"Elegant silver necklace","imagePath":"/img/necklace.jpg"},
    {"name":"Diamond Earrings","price":8000,"category":"Earrings","description":"Sparkling diamond earrings","imagePath":"/img/earrings.jpg"}
  ]'
```

## 🔧 Troubleshooting

**Products not showing?**

- Check MongoDB is running: `mongod --version`
- Verify backend: Visit `http://localhost:3000/api/test`
- Add sample products

**Can't login?**

- Clear browser localStorage
- Make sure account is registered first

**Port already in use?**

- Backend: Change port in `backend/server.js`
- Frontend: Vite tries next available port

---

**Professional Jewellery Ecommerce Platform**
