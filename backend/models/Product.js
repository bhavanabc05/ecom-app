// C:\Projects\ecom-app\models\Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  specs: { type: String },
  description: { type: String },
  imagePath: { type: String },
  stock: { type: Number, default: 10 },
  ratings: {
    average: { type: Number, default: 4.5 },
    count: { type: Number, default: 5 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);