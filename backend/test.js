const mongoose = require('mongoose');
const Product = require('./models/Product');

async function test() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/shop');
    console.log('Connected!');
    
    console.log('Querying products...');
    const products = await Product.find({});
    console.log('Found', products.length, 'products');
    console.log('Products:', products);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
