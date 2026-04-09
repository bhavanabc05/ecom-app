const express = require("express");
const User = require("../models/User");

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email or phone already registered" });
    }

    // Determine role for first registered user or admin email
    const existingUsers = await User.countDocuments();
    const adminEmails = ["admin@khanak.com", "admin@shop.com", "admin@example.com"];
    const role = existingUsers === 0 || adminEmails.includes(email.toLowerCase()) ? "admin" : "customer";

    // Create new user
    const user = new User({
      name,
      email,
      phone,
      password, // In production, hash with bcryptjs
      role,
    });

    await user.save();

    res.json({
      success: true,
      message: "Account created successfully!",
      userId: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Logged in successfully!",
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Get user profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile
router.put("/profile/:userId", async (req, res) => {
  try {
    const { name, address, city, zipCode } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        name,
        address,
        city,
        zipCode,
      },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
