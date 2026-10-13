import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    type: {
      type: String,
      enum: ['task', 'money', 'note', 'person'],
      required: true,
    },
    action: { type: String, required: true },
    description: { type: String, required: true },
    entityId: { type: String },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const ActivityModel = mongoose.model('Activity', activitySchema);
