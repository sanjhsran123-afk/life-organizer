import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserModel } from '../src/models/User.js';
import { AuthActivityModel } from '../src/models/AuthActivity.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dayledger';

async function main() {
  const args = process.argv.slice(2);
  const isDemote = args.includes('--demote');
  const emailArg = args.find((arg) => !arg.startsWith('--'));

  if (!emailArg) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DayLedger Administrator Provisioning Utility');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Usage:');
    console.log('  node server/scripts/promote-admin.js <user-email>           # Promote to admin');
    console.log('  node server/scripts/promote-admin.js <user-email> --demote  # Demote to regular user');
    console.log('\nExample:');
    console.log('  node server/scripts/promote-admin.js admin@dayledger.app');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }

  const normalizedEmail = emailArg.trim().toLowerCase();
  const targetRole = isDemote ? 'user' : 'admin';

  console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      console.error(`❌ User not found with email: ${normalizedEmail}`);
      console.log('Please register this account first through the app, then run this script.');
      process.exit(1);
    }

    const previousRole = user.role || 'user';
    if (previousRole === targetRole) {
      console.log(`ℹ️ User "${user.name}" (${user.email}) already has role "${targetRole}".`);
      process.exit(0);
    }

    user.role = targetRole;
    await user.save();

    // Log the role change in AuthActivity collection
    await AuthActivityModel.create({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      eventType: 'ROLE_CHANGED',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1 (CLI)',
      userAgent: 'DayLedger CLI promote-admin script',
      details: `Role updated from "${previousRole}" to "${targetRole}" via CLI script`,
      timestamp: new Date(),
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Success! User "${user.name}" (${user.email}) is now role: "${targetRole.toUpperCase()}".`);
    console.log(`   Database: ${MONGODB_URI}`);
    console.log(`   User ID:  ${user._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Failed to update user role:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
