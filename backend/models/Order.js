const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
      },
    ],
    total: Number,
    status: { type: String, default: "pending" }, // pending, shipped, delivered, cancelled
    shippingAddress: {
      name: String,
      phone: String,
      address: String,
      city: String,
      zipCode: String,
    },
    trackingNumber: String,
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
