const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/shop')
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Connection failed:', err));

const productsToUpload = [];

fs.createReadStream('Khanak Database.csv')
  // We define headers explicitly to match your CSV structure
  .pipe(csv(['id', 'category', 'name', 'price', 'specs', 'description', 'imagePath']))
  .on('data', (row) => {
    // 1. Skip the header row if the 'id' column contains the word "id"
    if (row.id.toLowerCase() === 'id') return;

    productsToUpload.push({
      name: row.name,
      category: row.category,
      price: parseFloat(row.price),
      specs: row.specs,
      description: row.description,
      imagePath: row.imagePath.trim() // Trim to remove accidental spaces/newlines
    });
  })
  .on('end', async () => {
    try {
      // 2. ABSOLUTELY CLEAR THE COLLECTION FIRST
      const deleted = await Product.deleteMany({});
      console.log(`Cleared ${deleted.deletedCount} old records.`);

      // 3. INSERT NEW DATA
      await Product.insertMany(productsToUpload);
      console.log(`Success: ${productsToUpload.length} new products imported!`);
      
    } catch (err) {
      console.error('Import Error:', err);
    } finally {
      mongoose.connection.close();
      console.log('Database connection closed.');
    }
  });