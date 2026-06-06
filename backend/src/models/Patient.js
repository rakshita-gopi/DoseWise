import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    relationship: { type: String, default: 'self' },
    dob: Date,
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    bloodGroup: String,
    height: Number,
    weight: Number,
    address: String,
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    caregiverDetails: {
      name: String,
      phone: String,
      email: String,
    },
    medicalConditions: [String],
    allergies: [String],
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      validUntil: Date,
    },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

patientSchema.index({ userId: 1 });
patientSchema.index({ ownerId: 1 });

export default mongoose.model('Patient', patientSchema);
