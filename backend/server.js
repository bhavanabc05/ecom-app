const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`REQUEST ${req.method} ${req.path}`);
  next();
});

// Import models FIRST
const Product = require("./models/Product");
const User = require("./models/User");
const Order = require("./models/Order");
const authRoutes = require("./routes/auth");

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/shop")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("MongoDB error:", err));

// ================= API ROUTES (BEFORE STATIC FILES) =================

// Auth routes
app.use("/api/auth", authRoutes);

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    console.log("DEBUG: /api/products route called");
    const products = await Product.find({});
    console.log("DEBUG: Found", products.length, "products");
    res.json(products);
  } catch (err) {
    console.error("ERROR in /api/products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Search products
app.get("/api/search", async (req, res) => {
  const q = req.query.q || "";
  const data = await Product.find({
    name: { $regex: q, $options: "i" }
  });
  res.json(data);
});

// Chat assistant
app.post("/api/chat", async (req, res) => {
  console.log("DEBUG: /api/chat request received", req.body);
  try {
    const message = (req.body.message || "").toString().trim();
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const products = await Product.find({});
    if (!products.length) {
      return res.json({ reply: "Our store is currently out of inventory. Please check back soon!" });
    }

    const text = message.toLowerCase();
    const rawTerms = text.split(/\s+/).filter((term) => term.length > 2);
    
    if (!rawTerms.length) {
      return res.json({ reply: "Could you tell me more about what you're looking for? Try: gold ring, silver necklace, diamond earrings, etc." });
    }

    // Synonym mapping for better matching
    const synonyms = {
      "chain": ["necklace", "pendant"],
      "necklace": ["chain", "pendant"],
      "ring": ["band", "solitaire"],
      "bracelet": ["bangle", "cuff"],
      "earring": ["stud", "hoop"],
      "gold": ["yellow", "au", "gld"],
      "silver": ["ag", "sterling", "slv"],
      "diamond": ["stone", "gem", "crystal"],
      "cheap": ["affordable", "budget"],
      "expensive": ["premium", "luxury"],
    };

    const expandedTerms = new Set(rawTerms);
    rawTerms.forEach((term) => {
      if (synonyms[term]) {
        synonyms[term].forEach((syn) => expandedTerms.add(syn));
      }
    });

    // Price range detection
    const priceMatch = text.match(/(?:under|below|less than|up to|within|around|under|below)\s*₹?([0-9,]+)/i);
    const priceThreshold = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;

    // Smart product matching with relevance scoring
    const scored = products.map((product) => {
      const combined = [
        product.name || "",
        product.category || "",
        product.description || "",
      ].join(" ").toLowerCase();

      let score = 0;
      let matchedTerms = 0;

      expandedTerms.forEach((term) => {
        if (combined.includes(term)) {
          score += 1;
          matchedTerms += 1;
          
          // Boost score if term is in product name (more specific match)
          if ((product.name || "").toLowerCase().includes(term)) {
            score += 2;
          }
        }
      });

      // Price filtering
      if (priceThreshold != null && Number(product.price || 0) > priceThreshold) {
        score = 0;
      }

      return { product, score, matchedTerms };
    });

    // Filter and sort by relevance
    const matches = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.matchedTerms - a.matchedTerms)
      .slice(0, 5)
      .map((item) => item.product);

    let reply = "I couldn't find an exact product match. Try asking about gold, rings, necklaces, earrings, or a price range like under 5000.";
    
    if (matches.length) {
      const lines = matches.map((product) => {
        return `• **${product.name}** (${product.category || "Jewellery"}) — ₹${product.price}`;
      });
      reply = `I found these perfect matches for you:\n\n${lines.join("\n")}\n\n**Would you like more details about any of these?**`;
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to generate chat reply" });
  }
});


// Place order
app.post("/api/order", async (req, res) => {
  try {
    const { userId, items, total, shippingAddress } = req.body;

    if (!userId || !items || !total) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const order = new Order({
      userId,
      items,
      total,
      shippingAddress: shippingAddress || {
        name: user.name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        zipCode: user.zipCode,
      },
    });

    await order.save();

    res.json({
      success: true,
      message: "✅ Order Placed",
      orderId: order._id,
    });
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// Get user orders
app.get("/api/orders/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get all orders for dashboard
app.get("/api/orders/all", async (req, res) => {
  try {
    const adminId = req.header("x-user-id");
    if (!adminId) {
      return res.status(401).json({ error: "Admin user ID is required" });
    }

    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const orders = await Order.find({});
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all orders" });
  }
});

// Update order status
app.put("/api/orders/:orderId/status", async (req, res) => {
  try {
    const userId = req.header("x-user-id");
    if (!userId) {
      return res.status(401).json({ error: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ error: "User not found" });
    }

    const { status, trackingNumber } = req.body;
    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const isOwner = order.userId.toString() === user._id.toString();
    const canCancel = status === "cancelled" && (isOwner || user.role === "admin");
    const canAdminUpdate = user.role === "admin";

    if (status !== "cancelled" && !canAdminUpdate) {
      return res.status(403).json({ error: "Only admin can update order stage" });
    }

    if (status === "cancelled" && !canCancel) {
      return res.status(403).json({ error: "Not authorized to cancel this order" });
    }

    order.status = status;
    order.trackingNumber = trackingNumber || order.trackingNumber;
    await order.save();

    res.json({ success: true, order });

  } catch (err) {
    console.error("Order update error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});



// Admin: Add one product
app.post("/api/add", async (req, res) => {
  try {
    const p = new Product(req.body);
    await p.save();
    res.json({ success: true, message: "Product added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add product" });
  }
});

// Admin: Add many products
app.post("/api/addMany", async (req, res) => {
  try {
    await Product.insertMany(req.body);
    res.json({ success: true, message: "Products added" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add products" });
  }
});

// Admin: Delete all products
app.delete("/api/deleteAll", async (req, res) => {
  try {
    await Product.deleteMany({});
    res.json({ success: true, message: "All products deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete products" });
  }
});

// ================= STATIC FILES (AFTER API ROUTES) =================

const frontendPath = path.join(__dirname, "..", "frontend");
const frontendBuildPath = path.join(frontendPath, "dist");
const hasFrontendBuild = fs.existsSync(frontendBuildPath);

if (hasFrontendBuild) {
  app.use(express.static(frontendBuildPath));
} else {
  app.use(express.static(frontendPath));
}

// Fallback for SPA (serves index.html for all non-API routes)
app.use((req, res) => {
  if (hasFrontendBuild) {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  } else {
    res.sendFile(path.join(frontendPath, "index.html"));
  }
});

// ================= SERVER =================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});