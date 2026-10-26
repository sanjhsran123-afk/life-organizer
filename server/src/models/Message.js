import mongoose from 'mongoose';
import { getPairKey } from './Friendship.js';

const messageSchema = new mongoose.Schema(
  {
    pairKey: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'file'],
      default: 'text',
    },
    text: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    file: {
      key: { type: String }, // R2 object storage key
      name: { type: String }, // Original filename
      size: { type: Number }, // Size in bytes
      mimeType: { type: String },
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to guarantee canonical pairKey is always computed
messageSchema.pre('validate', function (next) {
  if (this.senderId && this.recipientId) {
    this.pairKey = getPairKey(this.senderId, this.recipientId);
  }
  next();
});

// Compound indexes for fast message history retrieval and unread counters
messageSchema.index({ pairKey: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, read: 1 });

export const MessageModel = mongoose.model('Message', messageSchema);
