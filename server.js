const express = require("express");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(".")); // serve frontend

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/shop")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

// ================= SCHEMA =================

const Product = mongoose.model("Product", {
  name: String,
  price: Number,
  image: String,
  category: String
});

const Order = mongoose.model("Order", {
  items: Array,
  total: Number,
  date: { type: Date, default: Date.now }
});

// ================= ROUTES =================

// ➕ Add one product
app.post("/add", async (req, res) => {
  const p = new Product(req.body);
  await p.save();
  res.send("Product Added");
});

// 📦 Add many products
app.post("/addMany", async (req, res) => {
  await Product.insertMany(req.body);
  res.send("Products Added");
});

// ❌ Delete all products
app.delete("/deleteAll", async (req, res) => {
  await Product.deleteMany({});
  res.send("All products deleted");
});

// 📦 Get all products
app.get("/products", async (req, res) => {
  const data = await Product.find();
  res.json(data);
});

// 🔍 Search (only jewellery names)
app.get("/search", async (req, res) => {
  const q = req.query.q || "";

  const data = await Product.find({
    name: { $regex: q, $options: "i" }
  });

  res.json(data);
});

// 🛍️ Place order
app.post("/order", async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  res.send("✅ Order Placed");
});

// 📜 Get orders
app.get("/orders", async (req, res) => {
  const data = await Order.find();
  res.json(data);
});

// ================= SERVER =================

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});