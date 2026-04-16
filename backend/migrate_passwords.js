const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function migrateUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeqr', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Find users without plainPassword
    const usersWithoutPlainPassword = await User.find({ plainPassword: { $exists: false } });

    console.log(`Found ${usersWithoutPlainPassword.length} users without plainPassword`);

    // For existing users, set plainPassword to a placeholder (since we can't decrypt bcrypt)
    // In a real scenario, you'd need to ask users to reset passwords
    for (const user of usersWithoutPlainPassword) {
      user.plainPassword = '[ENCRYPTED - RESET REQUIRED]';
      await user.save();
      console.log(`Updated user: ${user.email}`);
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();