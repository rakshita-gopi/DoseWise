import mongoose from 'mongoose';

const doseLogSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    medicineName: { type: String, required: true },
    scheduledTime: { type: String, enum: ['morning', 'afternoon', 'night'], required: true },
    scheduledAt: Date,
    status: {
      type: String,
      enum: ['taken', 'missed', 'skipped', 'snoozed', 'pending'],
      default: 'pending',
    },
    takenAt: Date,
    notes: String,
  },
  { timestamps: true }
);

doseLogSchema.index({ patientId: 1, scheduledAt: 1 });

export default mongoose.model('DoseLog', doseLogSchema);
