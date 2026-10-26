import mongoose from 'mongoose';

/**
 * Returns a canonical, direction-independent key for any pair of user IDs.
 * Sorting the IDs ensures that (A, B) and (B, A) generate the identical key,
 * enabling strict database-level unique enforcement of one relationship per pair.
 *
 * @param {string} userA
 * @param {string} userB
 * @returns {string}
 */
export function getPairKey(userA, userB) {
  const [first, second] = [userA.toString(), userB.toString()].sort();
  return `${first}:${second}`;
}

const friendshipSchema = new mongoose.Schema(
  {
    // Canonical pair key to enforce exactly ONE relationship per pair atomically across both directions
    pairKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requesterId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'blocked'],
      default: 'pending',
      index: true,
    },
    blockedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to always compute and verify pairKey before saving
friendshipSchema.pre('validate', function (next) {
  if (this.requesterId && this.recipientId) {
    this.pairKey = getPairKey(this.requesterId, this.recipientId);
  }
  next();
});

// Explicit unique compound index on pairKey to enforce atomic uniqueness at the DB level
friendshipSchema.index({ pairKey: 1 }, { unique: true });
friendshipSchema.index({ recipientId: 1, status: 1 });
friendshipSchema.index({ requesterId: 1, status: 1 });

export const FriendshipModel = mongoose.model('Friendship', friendshipSchema);
