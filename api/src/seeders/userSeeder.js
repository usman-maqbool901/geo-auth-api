require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/geologin';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    const email = 'user@example.com';
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Seeder user already exists:', email);
      process.exit(0);
      return;
    }
    const user = new User({
      email,
      password: 'password123',
    });
    await user.save();
    console.log('Seeder user created:', email, '(password: password123)');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
