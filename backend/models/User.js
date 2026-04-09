const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In production, hash this with bcryptjs
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    preferences: {
      notifications: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
    },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
