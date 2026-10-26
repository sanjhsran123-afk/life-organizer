import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ userId: 1 });

export const PushSubscriptionModel = mongoose.model('PushSubscription', pushSubscriptionSchema);
