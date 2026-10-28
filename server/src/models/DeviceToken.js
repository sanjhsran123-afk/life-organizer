import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios'],
      default: 'android',
    },
    deviceModel: {
      type: String,
      default: '',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find user's active device tokens
deviceTokenSchema.index({ userId: 1, platform: 1 });

export const DeviceTokenModel = mongoose.model('DeviceToken', deviceTokenSchema);
