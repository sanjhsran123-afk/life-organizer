import mongoose from 'mongoose';

/**
 * User Schema for DayLedger
 * 
 * Fields:
 * - name: Full name of the user
 * - email: Normalized lowercase unique email
 * - phone: Normalized unique phone number
 * - age: Stored age at the time of registration
 * - dateOfBirth: Date of birth (YYYY-MM-DD string)
 * - password: Secure bcrypt hashed password (never stored in plaintext)
 * 
 * Age Accuracy Documentation:
 * Both the submitted age and the exact dateOfBirth are persisted. To ensure
 * that the user's age remains accurate over time as birthdays pass, a Mongoose
 * virtual getter `currentAge` calculates the real-time age dynamically:
 * (currentYear - birthYear), adjusted for the current month/day relative to the birthday.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    age: { type: Number, required: true, min: 1, max: 130 },
    dateOfBirth: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    currency: { type: String, default: '₹' },
    currencyCode: { type: String, default: 'INR' },
    avatarSeed: { type: String },
    isPhoneVerified: { type: Boolean, default: false, index: true },
    phoneDiscoverable: { type: Boolean, default: false, index: true },
    phoneVerificationHash: { type: String },
    phoneVerificationExpires: { type: Date },
    phoneVerificationAttempts: { type: Number, default: 0 },
    phoneVerificationLastSent: { type: Date },
    phoneVerificationHourlyCount: { type: Number, default: 0 },
    phoneVerificationHourlyReset: { type: Date },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property to dynamically compute age accurately whenever user's birthday passes
userSchema.virtual('currentAge').get(function () {
  if (!this.dateOfBirth) return this.age;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  if (isNaN(birthDate.getTime())) return this.age;
  let computedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    computedAge--;
  }
  return computedAge;
});

export const UserModel = mongoose.model('User', userSchema);
