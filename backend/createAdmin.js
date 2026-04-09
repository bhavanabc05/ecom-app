const mongoose = require("mongoose");
const User = require("./models/User");

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shop";
const [name, email, phone, password] = process.argv.slice(2);

if (!name || !email || !phone || !password) {
  console.error("Usage: node createAdmin.js <name> <email> <phone> <password>");
  process.exit(1);
}

async function run() {
  await mongoose.connect(mongoUri);

  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.role = "admin";
    existing.name = name;
    existing.phone = phone;
    existing.password = password;
    await existing.save();
    console.log(`Updated existing user ${email} to admin.`);
  } else {
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: "admin",
    });
    await user.save();
    console.log(`Created admin user ${email}.`);
  }

  mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});