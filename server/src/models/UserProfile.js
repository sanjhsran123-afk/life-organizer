import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Madhav' },
    email: { type: String, default: 'madhav@dayledger.app' },
    currency: { type: String, default: '₹' },
    currencyCode: { type: String, default: 'INR' },
    avatarSeed: { type: String, default: 'Madhav' },
  },
  { timestamps: true }
);

export const UserProfileModel = mongoose.model('UserProfile', userProfileSchema);
